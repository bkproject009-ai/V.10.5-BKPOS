-- Add storage management functions
BEGIN;

-- Create product_storage table if not exists
CREATE TABLE IF NOT EXISTS product_storage (
    product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    storage_stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cashier_stock table if not exists
CREATE TABLE IF NOT EXISTS cashier_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    cashier_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, cashier_id)
);

-- Function to update product storage stock
CREATE OR REPLACE FUNCTION update_product_storage_stock(
    p_product_id UUID,
    p_quantity INTEGER
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
    WHERE product_id = p_product_id;

    -- If no record exists, initialize with 0
    IF v_current_stock IS NULL THEN
        v_current_stock := 0;
    END IF;

    -- Calculate new stock
    v_new_stock := v_current_stock + p_quantity;

    -- Prevent negative stock
    IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Stok tidak mencukupi. Sisa stok: %', v_current_stock;
    END IF;

    -- Insert or update storage stock
    INSERT INTO product_storage (product_id, storage_stock)
    VALUES (p_product_id, v_new_stock)
    ON CONFLICT (product_id) DO UPDATE
    SET 
        storage_stock = EXCLUDED.storage_stock,
        updated_at = NOW();

    RETURN TRUE;
END;
$$;

-- Function to distribute stock to cashier
CREATE OR REPLACE FUNCTION distribute_stock_to_cashier(
    p_product_id UUID,
    p_cashier_id UUID,
    p_quantity INTEGER
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
        WHERE id = p_cashier_id 
        AND role = 'cashier'
    ) THEN
        RAISE EXCEPTION 'Invalid cashier ID';
    END IF;

    -- Get current storage stock
    SELECT storage_stock
    INTO v_storage_stock
    FROM product_storage
    WHERE product_id = p_product_id;

    -- Check if enough stock in storage
    IF v_storage_stock IS NULL OR v_storage_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient storage stock. Available: %', COALESCE(v_storage_stock, 0);
    END IF;

    -- Get current cashier stock
    SELECT stock
    INTO v_current_cashier_stock
    FROM cashier_stock
    WHERE product_id = p_product_id
    AND cashier_id = p_cashier_id;

    -- Update storage stock
    UPDATE product_storage
    SET storage_stock = storage_stock - p_quantity,
        updated_at = NOW()
    WHERE product_id = p_product_id;

    -- Update cashier stock
    INSERT INTO cashier_stock (product_id, cashier_id, stock)
    VALUES (p_product_id, p_cashier_id, p_quantity)
    ON CONFLICT (product_id, cashier_id) DO UPDATE
    SET 
        stock = cashier_stock.stock + EXCLUDED.stock,
        updated_at = NOW();

    RETURN TRUE;
END;
$$;

-- Enable RLS
ALTER TABLE product_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_stock ENABLE ROW LEVEL SECURITY;

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

COMMIT;