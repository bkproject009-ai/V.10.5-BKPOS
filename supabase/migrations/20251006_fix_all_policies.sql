-- Reset all existing policies first
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;
DROP POLICY IF EXISTS "Allow users to read own profile and admin read all" ON users;
DROP POLICY IF EXISTS "Allow users to update own profile and admin update all" ON users;
DROP POLICY IF EXISTS "Allow registration" ON users;
DROP POLICY IF EXISTS "Allow admin to delete users" ON users;
DROP POLICY IF EXISTS "Enable access for admin and manager on tax_types" ON tax_types;
DROP POLICY IF EXISTS "Allow read access to tax_types for all authenticated" ON tax_types;
DROP POLICY IF EXISTS "Allow write access to tax_types for admin and manager" ON tax_types;
DROP POLICY IF EXISTS "Allow read access to own sales and all for admin/manager" ON sales;
DROP POLICY IF EXISTS "Allow insert to sales for authenticated users" ON sales;
DROP POLICY IF EXISTS "Allow read access to sale_items for authenticated" ON sale_items;
DROP POLICY IF EXISTS "Allow insert to sale_items for authenticated" ON sale_items;
DROP POLICY IF EXISTS "Allow read access to products for authenticated" ON products;
DROP POLICY IF EXISTS "Allow write access to products for admin and manager" ON products;
DROP POLICY IF EXISTS "Allow read access to sales_taxes for authenticated" ON sales_taxes;
DROP POLICY IF EXISTS "Allow insert to sales_taxes for authenticated" ON sales_taxes;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to read own profile and admin read all"
ON users FOR SELECT
USING (
    auth.uid() = id 
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Allow users to update own profile and admin update all"
ON users FOR UPDATE
USING (
    auth.uid() = id 
    OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Allow registration"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow admin to delete users"
ON users FOR DELETE
USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Tax Types table policies
DROP POLICY IF EXISTS "Enable access for admin and manager on tax_types" ON tax_types;

ALTER TABLE tax_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to tax_types for all authenticated"
ON tax_types FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow write access to tax_types for admin and manager"
ON tax_types FOR ALL
TO authenticated
USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
)
WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Sales table policies
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to own sales and all for admin/manager"
ON sales FOR SELECT
TO authenticated
USING (
    cashier_id = auth.uid()
    OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
);

CREATE POLICY "Allow insert to sales for authenticated users"
ON sales FOR INSERT
TO authenticated
WITH CHECK (true);

-- Sales Items table policies
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to sale_items for authenticated"
ON sale_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow insert to sale_items for authenticated"
ON sale_items FOR INSERT
TO authenticated
WITH CHECK (true);

-- Products table policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to products for authenticated"
ON products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow write access to products for admin and manager"
ON products FOR ALL
TO authenticated
USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
)
WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'manager')
);

-- Sales Taxes table policies
ALTER TABLE sales_taxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to sales_taxes for authenticated"
ON sales_taxes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow insert to sales_taxes for authenticated"
ON sales_taxes FOR INSERT
TO authenticated
WITH CHECK (true);

-- Function to handle first user as admin
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users) THEN
        NEW.role = 'admin';
    ELSE
        NEW.role = COALESCE(NEW.role, 'cashier');
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
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;

GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;