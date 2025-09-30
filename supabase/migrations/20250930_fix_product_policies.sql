-- Reset and recreate products table RLS policies
BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON products;

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create new policies that allow all authenticated users to access products
CREATE POLICY "Enable read access for authenticated users"
    ON products FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for authenticated users"
    ON products FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
    ON products FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
    ON products FOR DELETE
    TO authenticated
    USING (true);

-- Insert sample products if none exist
INSERT INTO products (name, price, stock, description, sku)
SELECT 
    'Sample Product ' || n::text,
    (random() * 100000 + 1000)::numeric(10,2),
    (random() * 100 + 10)::integer,
    'Sample description for product ' || n::text,
    'SKU-' || lpad(n::text, 5, '0')
FROM generate_series(1, 5) n
WHERE NOT EXISTS (SELECT 1 FROM products LIMIT 1);

COMMIT;