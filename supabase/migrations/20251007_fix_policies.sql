-- Drop ALL existing policies with any possible name
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable insert access for admin users" ON products;
DROP POLICY IF EXISTS "Enable update access for admin users" ON products;
DROP POLICY IF EXISTS "Enable delete access for admin users" ON products;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable insert for admins" ON products;
DROP POLICY IF EXISTS "Enable update for admins" ON products;
DROP POLICY IF EXISTS "Enable delete for admins" ON products;
DROP POLICY IF EXISTS "products_insert_policy" ON products;
DROP POLICY IF EXISTS "products_update_policy" ON products;
DROP POLICY IF EXISTS "products_delete_policy" ON products;
DROP POLICY IF EXISTS "products_select_policy" ON products;

-- First, let's see what policies exist
SELECT *
FROM pg_policies
WHERE tablename = 'products';

-- Drop all policies on the products table (this is a safer way)
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN SELECT policyname 
               FROM pg_policies 
               WHERE tablename = 'products'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON products', pol.policyname);
    END LOOP;
END $$;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS public.is_admin();

-- Create a simpler version of is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Get the current user ID and check role directly from metadata
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO anon;

-- Simple policies with new names
CREATE POLICY "products_admin_insert" ON products
FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "products_admin_update" ON products
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "products_admin_delete" ON products
FOR DELETE TO authenticated
USING (public.is_admin());

CREATE POLICY "products_auth_select" ON products
FOR SELECT TO authenticated
USING (true);

-- Make sure RLS is enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Update user role (this time only in user_metadata)
UPDATE auth.users
SET raw_user_meta_data = 
  CASE 
    WHEN raw_user_meta_data IS NULL THEN 
      jsonb_build_object('role', 'admin')
    ELSE 
      jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{role}',
        '"admin"'
      )
  END
WHERE email = 'fadlannafian@gmail.com';