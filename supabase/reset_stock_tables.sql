-- Function to check and drop functions safely
CREATE OR REPLACE FUNCTION drop_functions_safely() RETURNS void AS $$
BEGIN
    DROP FUNCTION IF EXISTS adjust_warehouse_stock(TEXT, INTEGER, TEXT);
    DROP FUNCTION IF EXISTS distribute_stock_to_cashier(TEXT, TEXT, INTEGER, TEXT);
EXCEPTION WHEN OTHERS THEN
    -- Do nothing, function didn't exist
END;
$$ LANGUAGE plpgsql;

-- Drop all existing functions
SELECT drop_functions_safely();
DROP FUNCTION IF EXISTS drop_functions_safely();

-- Drop existing tables if they exist
DROP TABLE IF EXISTS stock_adjustments CASCADE;
DROP TABLE IF EXISTS cashier_stock CASCADE;
DROP TABLE IF EXISTS product_storage CASCADE;

-- Create product_storage table
CREATE TABLE product_storage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE,
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cashier_stock table
CREATE TABLE cashier_stock (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    cashier_id UUID REFERENCES auth.users(id),
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, cashier_id)
);

-- Create stock_adjustments table
CREATE TABLE stock_adjustments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity_change INTEGER NOT NULL,
    reason TEXT,
    adjusted_by UUID REFERENCES auth.users(id),
    adjusted_at TIMESTAMPTZ DEFAULT NOW(),
    location_type TEXT NOT NULL CHECK (location_type IN ('warehouse', 'cashier')),
    location_id UUID -- NULL for warehouse, cashier's user_id for cashier
);

-- Add indexes
CREATE INDEX idx_product_storage_product ON product_storage(product_id);
CREATE INDEX idx_cashier_stock_product ON cashier_stock(product_id);
CREATE INDEX idx_cashier_stock_cashier ON cashier_stock(cashier_id);
CREATE INDEX idx_stock_adjustments_product ON stock_adjustments(product_id);
CREATE INDEX idx_stock_adjustments_adjusted_by ON stock_adjustments(adjusted_by);

-- Enable RLS
ALTER TABLE product_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Allow select for authenticated users" ON product_storage
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all for authenticated users" ON product_storage
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow select for authenticated users" ON cashier_stock
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all for authenticated users" ON cashier_stock
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow select for authenticated users" ON stock_adjustments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for authenticated users" ON stock_adjustments
    FOR INSERT TO authenticated WITH CHECK (true);

-- Create the warehouse stock adjustment function
CREATE OR REPLACE FUNCTION adjust_warehouse_stock(
    _product_id TEXT,
    _quantity INTEGER,
    _reason TEXT
)
RETURNS JSON AS $$
DECLARE
    _current_stock INTEGER;
    _new_stock INTEGER;
    _uuid_product_id UUID;
BEGIN
    -- Convert text to UUID
    BEGIN
        _uuid_product_id := _product_id::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid product ID format: ' || _product_id
        );
    END;

    -- Get current stock quantity or insert new record if doesn't exist
    INSERT INTO product_storage (product_id, quantity)
    VALUES (_uuid_product_id, 0)
    ON CONFLICT (product_id) DO UPDATE 
    SET quantity = COALESCE(product_storage.quantity, 0)
    RETURNING quantity INTO _current_stock;

    -- Calculate new stock
    _new_stock := COALESCE(_current_stock, 0) + _quantity;
    
    -- Check for negative stock before update
    IF _new_stock < 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Stock tidak boleh negatif. Stok saat ini: %s, Pengurangan: %s', _current_stock, abs(_quantity))
        );
    END IF;

    -- Update stock quantity
    UPDATE product_storage
    SET quantity = _new_stock
    WHERE product_id = _uuid_product_id;

    -- Record the adjustment
    INSERT INTO stock_adjustments (
        product_id,
        quantity_change,
        reason,
        adjusted_by,
        location_type
    ) VALUES (
        _uuid_product_id,
        _quantity,
        _reason,
        auth.uid(),
        'warehouse'
    );

    RETURN json_build_object(
        'success', true,
        'previous_stock', _current_stock,
        'new_stock', _new_stock,
        'change', _quantity,
        'product_id', _uuid_product_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', format('Error adjusting stock for product %s', _product_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the stock distribution function
CREATE OR REPLACE FUNCTION distribute_stock_to_cashier(
    _product_id TEXT,
    _cashier_id TEXT,
    _quantity INTEGER,
    _reason TEXT DEFAULT 'Distribusi stok ke kasir'
)
RETURNS JSON AS $$
DECLARE
    _uuid_product_id UUID;
    _uuid_cashier_id UUID;
    _warehouse_stock INTEGER;
BEGIN
    -- Convert text to UUID
    BEGIN
        _uuid_product_id := _product_id::UUID;
        _uuid_cashier_id := _cashier_id::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid ID format',
            'detail', format('Product ID: %s, Cashier ID: %s', _product_id, _cashier_id)
        );
    END;

    -- Check warehouse stock
    SELECT quantity INTO _warehouse_stock
    FROM product_storage
    WHERE product_id = _uuid_product_id;

    IF _warehouse_stock IS NULL OR _warehouse_stock < _quantity THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Stok gudang tidak mencukupi. Tersedia: %s, Diminta: %s', COALESCE(_warehouse_stock, 0), _quantity)
        );
    END IF;

    -- Reduce warehouse stock
    UPDATE product_storage
    SET quantity = quantity - _quantity
    WHERE product_id = _uuid_product_id;

    -- Add stock to cashier
    INSERT INTO cashier_stock (product_id, cashier_id, quantity)
    VALUES (_uuid_product_id, _uuid_cashier_id, _quantity)
    ON CONFLICT (product_id, cashier_id)
    DO UPDATE SET quantity = cashier_stock.quantity + _quantity;

    -- Record the adjustments
    INSERT INTO stock_adjustments (
        product_id,
        quantity_change,
        reason,
        adjusted_by,
        location_type,
        location_id
    ) VALUES
    (
        _uuid_product_id,
        -_quantity,
        'Pengurangan stok untuk distribusi ke kasir',
        auth.uid(),
        'warehouse',
        NULL
    ),
    (
        _uuid_product_id,
        _quantity,
        _reason,
        auth.uid(),
        'cashier',
        _uuid_cashier_id
    );

    RETURN json_build_object(
        'success', true,
        'product_id', _uuid_product_id,
        'cashier_id', _uuid_cashier_id,
        'quantity', _quantity
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', format('Error distributing stock for product %s to cashier %s', _product_id, _cashier_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;