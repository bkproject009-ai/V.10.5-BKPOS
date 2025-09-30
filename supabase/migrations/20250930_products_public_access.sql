-- Create RLS policies for products table
BEGIN;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable select for all users" ON products;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON products;

-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow all users (including anonymous) to view products
CREATE POLICY "Enable select for all users"
    ON products
    FOR SELECT
    TO public
    USING (true);

-- Allow authenticated users to view and add products only
CREATE POLICY "Enable insert for authenticated users"
    ON products
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- No update policy - products cannot be modified once created
-- No delete policy - products cannot be deleted

-- Add any missing indices for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;