-- Create stock distributions table
CREATE TABLE IF NOT EXISTS stock_distributions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id uuid REFERENCES products(id) ON DELETE CASCADE,
    cashier_id uuid REFERENCES users(id) ON DELETE CASCADE,
    quantity integer NOT NULL CHECK (quantity > 0),
    distributed_by uuid REFERENCES users(id) ON DELETE SET NULL,
    distributed_at timestamp with time zone DEFAULT NOW(),
    notes text,
    created_at timestamp with time zone DEFAULT NOW(),
    updated_at timestamp with time zone DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_distributions_product_id ON stock_distributions(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_distributions_cashier_id ON stock_distributions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_stock_distributions_distributed_by ON stock_distributions(distributed_by);
CREATE INDEX IF NOT EXISTS idx_stock_distributions_distributed_at ON stock_distributions(distributed_at);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_stock_distributions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_stock_distributions_updated_at ON stock_distributions;

CREATE TRIGGER set_stock_distributions_updated_at
    BEFORE UPDATE ON stock_distributions
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_distributions_updated_at();

-- Add RLS policies
ALTER TABLE stock_distributions ENABLE ROW LEVEL SECURITY;

-- Policy for viewing distributions (authenticated users can view all distributions)
CREATE POLICY stock_distributions_view_policy ON stock_distributions
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy for inserting distributions (authenticated users can create distributions)
CREATE POLICY stock_distributions_insert_policy ON stock_distributions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy for updating distributions (only admin and manager can update)
CREATE POLICY stock_distributions_update_policy ON stock_distributions
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'manager')
        )
    );

-- Policy for deleting distributions (only admin can delete)
CREATE POLICY stock_distributions_delete_policy ON stock_distributions
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );