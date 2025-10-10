-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashier_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_distributions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS admin_all_products ON products;
DROP POLICY IF EXISTS cashier_products_policy ON products;
DROP POLICY IF EXISTS admin_all_cashier_stock ON cashier_stock;
DROP POLICY IF EXISTS cashier_own_stock ON cashier_stock;
DROP POLICY IF EXISTS admin_all_distributions ON stock_distributions;
DROP POLICY IF EXISTS cashier_view_own_distributions ON stock_distributions;

-- Create policies for products table
CREATE POLICY admin_all_products ON products
    FOR ALL
    TO authenticated
    USING (
        auth.jwt()->>'role' = 'admin'
    );

CREATE POLICY cashier_products_policy ON products
    FOR SELECT
    TO authenticated
    USING (
        auth.jwt()->>'role' = 'cashier' 
        AND EXISTS (
            SELECT 1 FROM cashier_stock cs
            WHERE cs.product_id = id
            AND cs.cashier_id = auth.uid()
            AND cs.quantity > 0
        )
    );

-- Create policies for cashier_stock table
CREATE POLICY admin_all_cashier_stock ON cashier_stock
    FOR ALL
    TO authenticated
    USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY cashier_own_stock ON cashier_stock
    FOR SELECT
    TO authenticated
    USING (
        cashier_id = auth.uid()
        AND quantity > 0
    );

-- Create policies for stock_distributions table
CREATE POLICY admin_all_distributions ON stock_distributions
    FOR ALL
    TO authenticated
    USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY cashier_view_own_distributions ON stock_distributions
    FOR SELECT
    TO authenticated
    USING (cashier_id = auth.uid());