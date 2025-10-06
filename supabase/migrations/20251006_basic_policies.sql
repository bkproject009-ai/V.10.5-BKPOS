-- Drop ALL existing policies and functions
DROP POLICY IF EXISTS "Allow users to read all users" ON users;
DROP POLICY IF EXISTS "Allow users to update own profile" ON users;
DROP POLICY IF EXISTS "Allow admin to manage users" ON users;
DROP POLICY IF EXISTS "Allow read access to products" ON products;
DROP POLICY IF EXISTS "Allow admin to manage products" ON products;
DROP POLICY IF EXISTS "Allow read access to tax_types" ON tax_types;
DROP POLICY IF EXISTS "Allow admin to manage tax_types" ON tax_types;
DROP POLICY IF EXISTS "Allow users to view own sales" ON sales;
DROP POLICY IF EXISTS "Allow users to create own sales" ON sales;
DROP POLICY IF EXISTS "Allow users to view own sale items" ON sale_items;
DROP POLICY IF EXISTS "Allow users to create sale items" ON sale_items;
DROP POLICY IF EXISTS "Allow users to view own sales taxes" ON sales_taxes;
DROP POLICY IF EXISTS "Allow users to create sales taxes" ON sales_taxes;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Reset RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE tax_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes ENABLE ROW LEVEL SECURITY;

-- Simple direct policies without functions
CREATE POLICY "users_select_policy" 
ON users FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "users_update_policy"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "users_insert_policy"
ON users FOR INSERT
TO authenticated
WITH CHECK (true);

-- Products policies
CREATE POLICY "products_select_policy"
ON products FOR SELECT
TO authenticated
USING (true);

-- Tax types policies
CREATE POLICY "tax_types_select_policy"
ON tax_types FOR SELECT
TO authenticated
USING (true);

-- Sales policies
CREATE POLICY "sales_select_policy"
ON sales FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "sales_insert_policy"
ON sales FOR INSERT
TO authenticated
WITH CHECK (cashier_id = auth.uid());

-- Sale items policies
CREATE POLICY "sale_items_select_policy"
ON sale_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "sale_items_insert_policy"
ON sale_items FOR INSERT
TO authenticated
WITH CHECK (true);

-- Sales taxes policies
CREATE POLICY "sales_taxes_select_policy"
ON sales_taxes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "sales_taxes_insert_policy"
ON sales_taxes FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create user trigger function for first user as admin
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users) THEN
        NEW.role := 'admin';
    ELSE
        NEW.role := 'cashier';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER set_user_role
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;