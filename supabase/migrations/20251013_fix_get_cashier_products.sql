-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_cashier_products();

-- Create function to get cashier products
CREATE OR REPLACE FUNCTION get_cashier_products()
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    price NUMERIC,
    category TEXT,
    sku TEXT,
    cashier_stock INTEGER,
    total_stock INTEGER,
    last_distributed TIMESTAMPTZ,
    distributed_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _user_id UUID;
BEGIN
    -- Get current user ID
    _user_id := auth.uid();
    
    -- Return products with their cashier stock
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.category,
        p.sku,
        COALESCE(cs.quantity, 0) as cashier_stock,
        COALESCE(ps.quantity, 0) as total_stock,
        COALESCE(
            (SELECT distributed_at 
             FROM stock_distributions 
             WHERE cashier_id = _user_id 
             AND product_id = p.id 
             ORDER BY distributed_at DESC 
             LIMIT 1),
            NULL
        ) as last_distributed,
        COALESCE(
            (SELECT distributed_by 
             FROM stock_distributions 
             WHERE cashier_id = _user_id 
             AND product_id = p.id 
             ORDER BY distributed_at DESC 
             LIMIT 1),
            NULL
        ) as distributed_by
    FROM products p
    LEFT JOIN cashier_stock cs ON cs.product_id = p.id AND cs.cashier_id = _user_id
    LEFT JOIN product_storage ps ON ps.product_id = p.id
    WHERE cs.quantity > 0  -- Only show products that have stock for this cashier
    ORDER BY p.name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_cashier_products() TO authenticated;