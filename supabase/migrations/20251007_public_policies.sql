-- Drop all existing policies
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable insert access for admin users" ON products;
DROP POLICY IF EXISTS "Enable update access for admin users" ON products;
DROP POLICY IF EXISTS "Enable delete access for admin users" ON products;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON products;

-- Create function to check if user is admin in public schema
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  _user_id uuid;
  _user_role text;
BEGIN
  -- Get the current user ID
  _user_id := auth.uid();
  
  -- Get the role from user_metadata
  SELECT raw_user_meta_data->>'role'
  INTO _user_role
  FROM auth.users
  WHERE id = _user_id;
  
  -- Return true if role is admin
  RETURN _user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simpler policies using the is_admin function
CREATE POLICY "Enable insert for admins"
ON products FOR INSERT 
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Enable update for admins"
ON products FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Enable delete for admins"
ON products FOR DELETE
TO authenticated
USING (public.is_admin());

-- Allow read access for all authenticated users
CREATE POLICY "Enable read access for authenticated users"
ON products FOR SELECT
TO authenticated
USING (true);

-- Make sure RLS is enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Ensure the admin role is set in user_metadata
UPDATE auth.users 
SET raw_user_meta_data = 
  CASE 
    WHEN raw_user_meta_data IS NULL THEN 
      jsonb_build_object('role', 'admin')
    ELSE 
      raw_user_meta_data || jsonb_build_object('role', 'admin')
  END
WHERE email = 'fadlannafian@gmail.com';

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;