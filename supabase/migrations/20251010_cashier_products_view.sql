-- Drop if exists
DROP FUNCTION IF EXISTS get_cashier_products();

-- Create function to get products distributed to cashier
CREATE OR REPLACE FUNCTION get_cashier_products()
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    price numeric,
    category text,
    sku text,
    cashier_stock integer,
    total_stock integer,
    last_distributed timestamp with time zone,
    distributed_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.category,
        p.sku,
        cs.quantity as cashier_stock,
        COALESCE(ps.quantity, 0) + cs.quantity as total_stock,
        sd.distributed_at as last_distributed,
        sd.distributed_by
    FROM products p
    INNER JOIN cashier_stock cs ON cs.product_id = p.id
    LEFT JOIN product_storage ps ON ps.product_id = p.id
    LEFT JOIN (
        SELECT DISTINCT ON (product_id) 
            product_id,
            distributed_at,
            distributed_by
        FROM stock_distributions
        WHERE cashier_id = auth.uid()
        ORDER BY product_id, distributed_at DESC
    ) sd ON sd.product_id = p.id
    WHERE cs.cashier_id = auth.uid()
    AND cs.quantity > 0;
END;
$$;