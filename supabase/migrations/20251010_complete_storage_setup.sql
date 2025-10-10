-- Complete reset and setup for storage management
BEGIN;

-- Drop existing tables and functions
DROP TABLE IF EXISTS stock_distributions CASCADE;
DROP TABLE IF EXISTS cashier_stock CASCADE;
DROP TABLE IF EXISTS product_storage CASCADE;
DROP FUNCTION IF EXISTS update_product_storage_stock(UUID, INTEGER);
DROP FUNCTION IF EXISTS distribute_stock_to_cashier(UUID, UUID, INTEGER, UUID);
DROP FUNCTION IF EXISTS update_total_stock();

-- Create product_storage table
CREATE TABLE IF NOT EXISTS product_storage (
    product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    storage_stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cashier_stock table
CREATE TABLE IF NOT EXISTS cashier_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    cashier_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, cashier_id)
);

-- Create stock_distributions table
CREATE TABLE IF NOT EXISTS stock_distributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    cashier_id UUID REFERENCES users(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    distributed_by UUID REFERENCES users(id) ON DELETE CASCADE,
    distributed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to update total stock in products table
CREATE OR REPLACE FUNCTION update_total_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    WITH total_stocks AS (
        SELECT 
            p.id as product_id,
            COALESCE(ps.storage_stock, 0) as storage_stock,
            COALESCE(SUM(cs.stock), 0) as cashier_stock
        FROM products p
        LEFT JOIN product_storage ps ON p.id = ps.product_id
        LEFT JOIN cashier_stock cs ON p.id = cs.product_id
        WHERE p.id = COALESCE(NEW.product_id, OLD.product_id)
        GROUP BY p.id, ps.storage_stock
    )
    UPDATE products
    SET 
        stock = t.storage_stock + t.cashier_stock,
        updated_at = NOW()
    FROM total_stocks t
    WHERE products.id = t.product_id;
    
    RETURN NULL;
END;
$$;

-- Function to update product storage stock
CREATE OR REPLACE FUNCTION update_product_storage_stock(
    _product_id UUID,
    _quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock INTEGER;
    v_new_stock INTEGER;
BEGIN
    -- Get current storage stock
    SELECT COALESCE(storage_stock, 0)
    INTO v_current_stock
    FROM product_storage
    WHERE product_id = _product_id;

    -- If no record exists, initialize with 0
    IF v_current_stock IS NULL THEN
        v_current_stock := 0;
    END IF;

    -- Calculate new stock
    v_new_stock := v_current_stock + _quantity;

    -- Prevent negative stock
    IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Stok tidak mencukupi. Sisa stok: %', v_current_stock;
    END IF;

    -- Insert or update storage stock
    INSERT INTO product_storage (product_id, storage_stock)
    VALUES (_product_id, v_new_stock)
    ON CONFLICT (product_id) DO UPDATE
    SET 
        storage_stock = EXCLUDED.storage_stock,
        updated_at = NOW();

    RETURN TRUE;
END;
$$;

-- Function to distribute stock to cashier
CREATE OR REPLACE FUNCTION distribute_stock_to_cashier(
    _product_id UUID,
    _cashier_id UUID,
    _quantity INTEGER,
    _distributed_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_storage_stock INTEGER;
    v_current_cashier_stock INTEGER;
BEGIN
    -- Check if user is cashier
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = _cashier_id 
        AND role = 'cashier'
    ) THEN
        RAISE EXCEPTION 'Invalid cashier ID';
    END IF;

    -- Get current storage stock
    SELECT storage_stock
    INTO v_storage_stock
    FROM product_storage
    WHERE product_id = _product_id;

    -- Check if enough stock in storage
    IF v_storage_stock IS NULL OR v_storage_stock < _quantity THEN
        RAISE EXCEPTION 'Insufficient storage stock. Available: %', COALESCE(v_storage_stock, 0);
    END IF;

    -- Get current cashier stock
    SELECT stock
    INTO v_current_cashier_stock
    FROM cashier_stock
    WHERE product_id = _product_id
    AND cashier_id = _cashier_id;

    -- Update storage stock
    UPDATE product_storage
    SET storage_stock = storage_stock - _quantity,
        updated_at = NOW()
    WHERE product_id = _product_id;

    -- Update cashier stock
    INSERT INTO cashier_stock (product_id, cashier_id, stock)
    VALUES (_product_id, _cashier_id, _quantity)
    ON CONFLICT (product_id, cashier_id) DO UPDATE
    SET 
        stock = cashier_stock.stock + EXCLUDED.stock,
        updated_at = NOW();

    -- Record the distribution
    INSERT INTO stock_distributions (
        product_id,
        cashier_id,
        quantity,
        distributed_by,
        distributed_at
    ) VALUES (
        _product_id,
        _cashier_id,
        _quantity,
        _distributed_by,
        NOW()
    );

    RETURN TRUE;
END;
$$;

-- Create triggers to update total stock
DROP TRIGGER IF EXISTS update_total_stock_product_storage ON product_storage;
CREATE TRIGGER update_total_stock_product_storage
    AFTER INSERT OR UPDATE OR DELETE ON product_storage
    FOR EACH ROW
    EXECUTE FUNCTION update_total_stock();

DROP TRIGGER IF EXISTS update_total_stock_cashier_stock ON cashier_stock;
CREATE TRIGGER update_total_stock_cashier_stock
    AFTER INSERT OR UPDATE OR DELETE ON cashier_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_total_stock();

-- Enable RLS
ALTER TABLE product_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_distributions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Enable read for authenticated users on product_storage"
    ON product_storage FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable update for admins on product_storage"
    ON product_storage FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Enable read for authenticated users on cashier_stock"
    ON cashier_stock FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable update for admins on cashier_stock"
    ON cashier_stock FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Enable read for authenticated users on stock_distributions"
    ON stock_distributions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for admins on stock_distributions"
    ON stock_distributions FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

COMMIT;