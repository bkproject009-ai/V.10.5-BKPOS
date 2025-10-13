-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_warehouse_stock(uuid);
DROP FUNCTION IF EXISTS get_product_stock_details(uuid);

-- Function to get warehouse stock for a specific product
CREATE OR REPLACE FUNCTION get_warehouse_stock(product_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stock integer;
BEGIN
    SELECT quantity INTO stock
    FROM product_storage
    WHERE product_id = product_id_param;
    
    RETURN COALESCE(stock, 0);
END;
$$;

-- Function to get detailed stock information for a product
CREATE OR REPLACE FUNCTION get_product_stock_details(product_id_param uuid)
RETURNS TABLE (
    product_id uuid,
    warehouse_stock integer,
    total_cashier_stock integer,
    total_stock integer,
    last_updated timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH cashier_totals AS (
        SELECT 
            cs.product_id,
            COALESCE(SUM(cs.quantity), 0) as total_cashier_stock
        FROM cashier_stock cs
        WHERE cs.product_id = product_id_param
        GROUP BY cs.product_id
    )
    SELECT 
        p.id as product_id,
        COALESCE(ps.quantity, 0) as warehouse_stock,
        COALESCE(ct.total_cashier_stock, 0) as total_cashier_stock,
        COALESCE(ps.quantity, 0) + COALESCE(ct.total_cashier_stock, 0) as total_stock,
        GREATEST(
            ps.updated_at,
            (SELECT MAX(updated_at) FROM cashier_stock WHERE product_id = p.id)
        ) as last_updated
    FROM products p
    LEFT JOIN product_storage ps ON ps.product_id = p.id
    LEFT JOIN cashier_totals ct ON ct.product_id = p.id
    WHERE p.id = product_id_param;
END;
$$;

-- Function to get all products with their stock details
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
        GREATEST(
            ps.updated_at,
            (SELECT MAX(updated_at) FROM cashier_stock WHERE product_id = p.id)
        ) as last_updated
    FROM products p
    LEFT JOIN product_storage ps ON ps.product_id = p.id
    LEFT JOIN cashier_totals ct ON ct.product_id = p.id
    ORDER BY p.name;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_warehouse_stock(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_stock_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_products_with_stock() TO authenticated;

-- Create or update RLS policies for product_storage table
ALTER TABLE IF EXISTS product_storage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public product_storage read access" ON product_storage;
CREATE POLICY "Public product_storage read access" ON product_storage
    FOR SELECT TO authenticated
    USING (true);  -- Everyone can read stock information

DROP POLICY IF EXISTS "Admin product_storage write access" ON product_storage;
CREATE POLICY "Admin product_storage write access" ON product_storage
    FOR ALL TO authenticated
    USING (
        (SELECT is_admin() = true)  -- Only admins can modify
    );