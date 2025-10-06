-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON sales;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON sales;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON sale_items;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON sale_items;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role IN ('admin', 'manager')
    FROM users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is cashier
CREATE OR REPLACE FUNCTION public.is_cashier()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'cashier'
    FROM users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Products table policies
CREATE POLICY "Admins can do everything" ON products
FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Managers can view and update products" ON products
FOR SELECT TO authenticated
USING (is_manager());

CREATE POLICY "Managers can update products" ON products
FOR UPDATE TO authenticated
USING (is_manager())
WITH CHECK (is_manager());

CREATE POLICY "Cashiers can only view products" ON products
FOR SELECT TO authenticated
USING (is_cashier());

-- Sales table policies
CREATE POLICY "Admins have full access to sales" ON sales
FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Managers can view and create sales" ON sales
FOR SELECT TO authenticated
USING (is_manager());

CREATE POLICY "Managers can create sales" ON sales
FOR INSERT TO authenticated
WITH CHECK (is_manager());

CREATE POLICY "Cashiers can view and create sales" ON sales
FOR SELECT TO authenticated
USING (is_cashier());

CREATE POLICY "Cashiers can create sales" ON sales
FOR INSERT TO authenticated
WITH CHECK (is_cashier());

-- Sale items table policies
CREATE POLICY "Admins have full access to sale items" ON sale_items
FOR ALL TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Managers can view and create sale items" ON sale_items
FOR SELECT TO authenticated
USING (is_manager());

CREATE POLICY "Managers can create sale items" ON sale_items
FOR INSERT TO authenticated
WITH CHECK (is_manager());

CREATE POLICY "Cashiers can view and create sale items" ON sale_items
FOR SELECT TO authenticated
USING (is_cashier());

CREATE POLICY "Cashiers can create sale items" ON sale_items
FOR INSERT TO authenticated
WITH CHECK (is_cashier());

-- Update users table to enforce role constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'cashier'));

-- Create trigger to ensure first user is admin
CREATE OR REPLACE FUNCTION public.ensure_first_user_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users) THEN
    NEW.role := 'admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_first_user_admin ON users;
CREATE TRIGGER ensure_first_user_admin
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_first_user_admin();

-- Update existing users table
UPDATE users 
SET role = 'admin' 
WHERE id IN (
    SELECT id 
    FROM users 
    ORDER BY created_at 
    LIMIT 1
);

-- Ensure role field is not null
UPDATE users 
SET role = 'cashier' 
WHERE role IS NULL;