-- Drop the function first to avoid dependency issues
DROP FUNCTION IF EXISTS adjust_warehouse_stock(TEXT, INTEGER, TEXT);

-- Check and modify the table structure
DO $$ 
BEGIN
    -- Check if the table exists with the wrong column name
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_storage' 
        AND column_name = 'quantity'
    ) THEN
        -- Rename the column if it exists
        ALTER TABLE product_storage RENAME COLUMN quantity TO stock_quantity;
    END IF;

    -- Create the table if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_storage') THEN
        CREATE TABLE product_storage (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            product_id UUID REFERENCES products(id) ON DELETE CASCADE UNIQUE,
            stock_quantity INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Add index
        CREATE INDEX idx_product_storage_product ON product_storage(product_id);
    END IF;

    -- Add the column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_storage' 
        AND column_name = 'stock_quantity'
    ) THEN
        ALTER TABLE product_storage ADD COLUMN stock_quantity INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Re-create the stock adjustments table
DROP TABLE IF EXISTS stock_adjustments;
CREATE TABLE stock_adjustments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity_change INTEGER NOT NULL,
    reason TEXT,
    adjusted_by UUID REFERENCES auth.users(id),
    adjusted_at TIMESTAMPTZ DEFAULT NOW(),
    location_type TEXT NOT NULL CHECK (location_type IN ('warehouse', 'cashier')),
    location_id UUID
);

-- Add indexes
CREATE INDEX idx_stock_adjustments_product ON stock_adjustments(product_id);
CREATE INDEX idx_stock_adjustments_adjusted_by ON stock_adjustments(adjusted_by);

-- Enable RLS
ALTER TABLE product_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
DROP POLICY IF EXISTS "Allow select for authenticated users" ON product_storage;
CREATE POLICY "Allow select for authenticated users"
    ON product_storage
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow insert/update for authenticated users" ON product_storage;
CREATE POLICY "Allow insert/update for authenticated users"
    ON product_storage
    FOR ALL
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow select for authenticated users" ON stock_adjustments;
CREATE POLICY "Allow select for authenticated users"
    ON stock_adjustments
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON stock_adjustments;
CREATE POLICY "Allow insert for authenticated users"
    ON stock_adjustments
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create the function
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
    INSERT INTO product_storage (product_id, stock_quantity)
    VALUES (_uuid_product_id, 0)
    ON CONFLICT (product_id) DO UPDATE 
    SET stock_quantity = COALESCE(product_storage.stock_quantity, 0)
    RETURNING stock_quantity INTO _current_stock;

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
    SET stock_quantity = _new_stock
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
    -- Return error information
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', format('Error adjusting stock for product %s with quantity %s', _product_id, _quantity)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;