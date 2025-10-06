-- Drop all existing policies first
DROP POLICY IF EXISTS "Enable read for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable all operations on tax_types" ON tax_types;
DROP POLICY IF EXISTS "Enable all operations on sales" ON sales;
DROP POLICY IF EXISTS "Enable all operations on sale_items" ON sale_items;
DROP POLICY IF EXISTS "Enable all operations on products" ON products;
DROP POLICY IF EXISTS "Enable all operations on sales_taxes" ON sales_taxes;

-- Reset RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE tax_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes DISABLE ROW LEVEL SECURITY;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes ENABLE ROW LEVEL SECURITY;

-- Users table policies with role-based access
CREATE POLICY "Users can read their own data"
ON users FOR SELECT
TO authenticated
USING (
    auth.uid() = id OR -- Users can read their own data
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin' -- Admins can read all
);

CREATE POLICY "Users can update their own data"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Only admins can insert users"
ON users FOR INSERT
TO authenticated
WITH CHECK (
    NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin') OR -- First user can be admin
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin' -- Only admins can insert after
);

CREATE POLICY "Only admins can delete users"
ON users FOR DELETE
TO authenticated
USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Products table policies
CREATE POLICY "Enable read access for authenticated users on products"
ON products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable write access for admins on products"
ON products FOR ALL
TO authenticated
USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Tax types table policies
CREATE POLICY "Enable read access for authenticated users on tax_types"
ON tax_types FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable write access for admins on tax_types"
ON tax_types FOR ALL
TO authenticated
USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin')
WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Sales table policies
CREATE POLICY "Enable read access for own sales and admin"
ON sales FOR SELECT
TO authenticated
USING (
    cashier_id = auth.uid() OR -- Users can see their own sales
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin' -- Admins can see all sales
);

CREATE POLICY "Enable insert for authenticated users on sales"
ON sales FOR INSERT
TO authenticated
WITH CHECK (cashier_id = auth.uid());

-- Sale items policies
CREATE POLICY "Enable read access for related sales on sale_items"
ON sale_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM sales
        WHERE sales.id = sale_items.sale_id
        AND (sales.cashier_id = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin')
    )
);

CREATE POLICY "Enable insert for authenticated users on sale_items"
ON sale_items FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales
        WHERE sales.id = sale_items.sale_id
        AND sales.cashier_id = auth.uid()
    )
);

-- Sales taxes policies
CREATE POLICY "Enable read access for related sales on sales_taxes"
ON sales_taxes FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM sales
        WHERE sales.id = sales_taxes.sale_id
        AND (sales.cashier_id = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin')
    )
);

CREATE POLICY "Enable insert for authenticated users on sales_taxes"
ON sales_taxes FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales
        WHERE sales.id = sales_taxes.sale_id
        AND sales.cashier_id = auth.uid()
    )
);

-- Function to handle first user as admin
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin') THEN
        NEW.role = 'admin';
    ELSE
        NEW.role = 'cashier';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user role assignment
DROP TRIGGER IF EXISTS set_user_role ON users;
CREATE TRIGGER set_user_role
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Refresh schemas
SELECT pg_catalog.set_config('search_path', 'public', false);