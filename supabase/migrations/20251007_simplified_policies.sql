-- Drop all existing policies
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable insert access for admin users" ON products;
DROP POLICY IF EXISTS "Enable update access for admin users" ON products;
DROP POLICY IF EXISTS "Enable delete access for admin users" ON products;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON products;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Get the role from both metadata fields for the current user
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = auth.uid() 
    AND (
      (raw_user_meta_data->>'role' = 'admin') OR 
      (raw_app_meta_data->>'role' = 'admin')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simpler policies using the is_admin function
CREATE POLICY "Enable insert for admins"
ON products FOR INSERT 
TO authenticated
WITH CHECK (auth.is_admin());

CREATE POLICY "Enable update for admins"
ON products FOR UPDATE
TO authenticated
USING (auth.is_admin())
WITH CHECK (auth.is_admin());

CREATE POLICY "Enable delete for admins"
ON products FOR DELETE
TO authenticated
USING (auth.is_admin());

-- Allow read access for all authenticated users
CREATE POLICY "Enable read access for authenticated users"
ON products FOR SELECT
TO authenticated
USING (true);

-- Make sure RLS is enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Ensure the admin role is set correctly
UPDATE auth.users 
SET 
  raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN '{"role": "admin"}'::jsonb
      ELSE raw_user_meta_data || '{"role": "admin"}'::jsonb
    END,
  raw_app_meta_data = 
    CASE 
      WHEN raw_app_meta_data IS NULL THEN '{"role": "admin"}'::jsonb
      ELSE raw_app_meta_data || '{"role": "admin"}'::jsonb
    END
WHERE email = 'fadlannafian@gmail.com';