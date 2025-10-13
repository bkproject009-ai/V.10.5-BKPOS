-- Check and create product_storage table if not exists
CREATE TABLE IF NOT EXISTS product_storage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id)
);

-- Add updated_at column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'product_storage' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE product_storage ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create index on product_id
CREATE INDEX IF NOT EXISTS idx_product_storage_product_id ON product_storage(product_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_product_storage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_product_storage_timestamp ON product_storage;
CREATE TRIGGER trigger_update_product_storage_timestamp
    BEFORE UPDATE ON product_storage
    FOR EACH ROW
    EXECUTE FUNCTION update_product_storage_updated_at();

-- Make sure we have a record for each product
INSERT INTO product_storage (product_id, quantity)
SELECT id, 0
FROM products p
WHERE NOT EXISTS (
    SELECT 1 
    FROM product_storage ps 
    WHERE ps.product_id = p.id
);

-- Fix the get_all_products_with_stock function
CREATE OR REPLACE FUNCTION get_all_products_with_stock()
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    price numeric,
    category text,
    sku text,
    warehouse_stock integer,
    total_cashier_stock integer,
    total_stock integer,
    last_updated timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH cashier_totals AS (
        SELECT 
            cs.product_id,
            COALESCE(SUM(cs.quantity), 0) as total_cashier_stock
        FROM cashier_stock cs
        GROUP BY cs.product_id
    )
    SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.category,
        p.sku,
        COALESCE(ps.quantity, 0) as warehouse_stock,
        COALESCE(ct.total_cashier_stock, 0) as total_cashier_stock,
        COALESCE(ps.quantity, 0) + COALESCE(ct.total_cashier_stock, 0) as total_stock,
        COALESCE(ps.updated_at, p.created_at) as last_updated
    FROM products p
    LEFT JOIN product_storage ps ON ps.product_id = p.id
    LEFT JOIN cashier_totals ct ON ct.product_id = p.id;
END;
$$;

-- Grant necessary permissions
GRANT ALL ON TABLE product_storage TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_products_with_stock() TO authenticated;

-- Update RLS policies
ALTER TABLE product_storage ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Allow read access to product_storage"
    ON product_storage FOR SELECT
    TO authenticated
    USING (true);

-- Allow write access only to admins
CREATE POLICY "Allow write access to product_storage for admins"
    ON product_storage FOR ALL
    TO authenticated
    USING (
        (SELECT is_admin() FROM is_admin())
    );