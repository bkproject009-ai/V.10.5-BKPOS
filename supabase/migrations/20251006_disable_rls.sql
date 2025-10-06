-- First, drop everything and start fresh
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "products_select_policy" ON products;
DROP POLICY IF EXISTS "tax_types_select_policy" ON tax_types;
DROP POLICY IF EXISTS "sales_select_policy" ON sales;
DROP POLICY IF EXISTS "sales_insert_policy" ON sales;
DROP POLICY IF EXISTS "sale_items_select_policy" ON sale_items;
DROP POLICY IF EXISTS "sale_items_insert_policy" ON sale_items;
DROP POLICY IF EXISTS "sales_taxes_select_policy" ON sales_taxes;
DROP POLICY IF EXISTS "sales_taxes_insert_policy" ON sales_taxes;

-- Drop ALL other possible policies
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

-- Drop functions
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP TRIGGER IF EXISTS set_user_role ON users;

-- Completely disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE tax_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes DISABLE ROW LEVEL SECURITY;

-- Create minimal function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users) THEN
    NEW.role := 'admin';
  ELSE
    NEW.role := 'cashier';
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant basic permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;