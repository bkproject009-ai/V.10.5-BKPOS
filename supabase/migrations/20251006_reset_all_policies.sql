-- Drop ALL existing policies first, including the new ones we want to create
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

-- Also drop old policies just to be safe
DROP POLICY IF EXISTS "Users can read their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Only admins can insert users" ON users;
DROP POLICY IF EXISTS "Only admins can delete users" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users on users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "First user becomes admin or admin can create users" ON users;
DROP POLICY IF EXISTS "Only admin can delete users" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users on products" ON products;
DROP POLICY IF EXISTS "Enable write access for admins on products" ON products;
DROP POLICY IF EXISTS "Enable read access for authenticated users on tax_types" ON tax_types;
DROP POLICY IF EXISTS "Enable write access for admins on tax_types" ON tax_types;
DROP POLICY IF EXISTS "Enable read access for own sales and admin" ON sales;
DROP POLICY IF EXISTS "Enable insert for authenticated users on sales" ON sales;
DROP POLICY IF EXISTS "Enable read access for related sales on sale_items" ON sale_items;
DROP POLICY IF EXISTS "Enable insert for authenticated users on sale_items" ON sale_items;
DROP POLICY IF EXISTS "Enable read access for related sales on sales_taxes" ON sales_taxes;
DROP POLICY IF EXISTS "Enable insert for authenticated users on sales_taxes" ON sales_taxes;

-- Drop and recreate the is_admin function
DROP FUNCTION IF EXISTS is_admin();

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Create new policies
CREATE POLICY "Allow users to read all users"
ON users FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow users to update own profile"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Allow admin to manage users"
ON users FOR ALL
TO authenticated
USING (is_admin());

CREATE POLICY "Allow read access to products"
ON products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admin to manage products"
ON products FOR ALL
TO authenticated
USING (is_admin());

CREATE POLICY "Allow read access to tax_types"
ON tax_types FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admin to manage tax_types"
ON tax_types FOR ALL
TO authenticated
USING (is_admin());

CREATE POLICY "Allow users to view own sales"
ON sales FOR SELECT
TO authenticated
USING (
  cashier_id = auth.uid() OR is_admin()
);

CREATE POLICY "Allow users to create own sales"
ON sales FOR INSERT
TO authenticated
WITH CHECK (cashier_id = auth.uid());

CREATE POLICY "Allow users to view own sale items"
ON sale_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sales
    WHERE id = sale_items.sale_id
    AND (cashier_id = auth.uid() OR is_admin())
  )
);

CREATE POLICY "Allow users to create sale items"
ON sale_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sales
    WHERE id = sale_items.sale_id
    AND cashier_id = auth.uid()
  )
);

CREATE POLICY "Allow users to view own sales taxes"
ON sales_taxes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sales
    WHERE id = sales_taxes.sale_id
    AND (cashier_id = auth.uid() OR is_admin())
  )
);

CREATE POLICY "Allow users to create sales taxes"
ON sales_taxes FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sales
    WHERE id = sales_taxes.sale_id
    AND cashier_id = auth.uid()
  )
);

-- Drop and recreate user trigger function
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin') THEN
    NEW.role := 'admin';
  ELSE
    NEW.role := 'cashier';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
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

-- Reset search path
SELECT pg_catalog.set_config('search_path', 'public', false);