-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create user roles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'manager') THEN
    CREATE ROLE manager;
  END IF;
END
$$;

-- Products table policies
CREATE POLICY "Enable read access for everyone on products"
ON products FOR SELECT
TO PUBLIC
USING (true);

CREATE POLICY "Enable write access for authenticated users on products"
ON products FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users on products"
ON products FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Sales table policies
CREATE POLICY "Enable access for authenticated users on sales"
ON sales FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Tax types table policies
CREATE POLICY "Enable access for admin and manager on tax_types"
ON tax_types FOR ALL
TO admin, manager
USING (true)
WITH CHECK (true);

-- Settings table policies
CREATE POLICY "Enable access for authenticated users on settings"
ON settings FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1
      FROM auth.users u
      JOIN auth.users_roles ur ON u.id = ur.user_id
      WHERE u.id = auth.uid()
      AND ur.role IN ('admin', 'manager')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dashboard access control function
CREATE OR REPLACE FUNCTION public.can_access_dashboard()
RETURNS boolean AS $$
BEGIN
  RETURN is_admin_or_manager();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add role management functions
CREATE OR REPLACE FUNCTION public.add_user_role(user_id uuid, role text)
RETURNS void AS $$
BEGIN
  INSERT INTO auth.users_roles (user_id, role)
  VALUES (user_id, role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove user role
CREATE OR REPLACE FUNCTION public.remove_user_role(user_id uuid, role text)
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users_roles
  WHERE user_id = $1 AND role = $2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;