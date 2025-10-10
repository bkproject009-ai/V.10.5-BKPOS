-- Create cashier_stock table if it doesn't exist
CREATE TABLE IF NOT EXISTS cashier_stock (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    cashier_id UUID REFERENCES auth.users(id),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, cashier_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_cashier_stock_product ON cashier_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_cashier_stock_cashier ON cashier_stock(cashier_id);

-- Enable RLS
ALTER TABLE cashier_stock ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
DROP POLICY IF EXISTS "Allow select for authenticated users" ON cashier_stock;
CREATE POLICY "Allow select for authenticated users"
    ON cashier_stock
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow insert/update for authenticated users" ON cashier_stock;
CREATE POLICY "Allow insert/update for authenticated users"
    ON cashier_stock
    FOR ALL
    TO authenticated
    USING (true);

-- Function to distribute stock to cashier
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
    SELECT stock_quantity INTO _warehouse_stock
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
    SET stock_quantity = stock_quantity - _quantity
    WHERE product_id = _uuid_product_id;

    -- Add stock to cashier
    INSERT INTO cashier_stock (product_id, cashier_id, stock_quantity)
    VALUES (_uuid_product_id, _uuid_cashier_id, _quantity)
    ON CONFLICT (product_id, cashier_id)
    DO UPDATE SET stock_quantity = cashier_stock.stock_quantity + _quantity;

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