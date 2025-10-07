-- Drop existing policies first
DROP POLICY IF EXISTS "allow_read_products" ON products;
DROP POLICY IF EXISTS "allow_write_products" ON products;
DROP POLICY IF EXISTS "products_read" ON products;
DROP POLICY IF EXISTS "products_write" ON products;

-- Create new policies for products table
CREATE POLICY "products_select_policy" ON products
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "products_insert_policy" ON products
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id
    AND (
      raw_user_meta_data->>'role' = 'admin'
      OR raw_user_meta_data->>'role' = 'manager'
    )
  )
);

CREATE POLICY "products_update_policy" ON products
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id
    AND (
      raw_user_meta_data->>'role' = 'admin'
      OR raw_user_meta_data->>'role' = 'manager'
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id
    AND (
      raw_user_meta_data->>'role' = 'admin'
      OR raw_user_meta_data->>'role' = 'manager'
    )
  )
);

CREATE POLICY "products_delete_policy" ON products
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id
    AND raw_user_meta_data->>'role' = 'admin'
  )
);

-- Create or replace function to check product permissions
CREATE OR REPLACE FUNCTION public.check_product_permissions(operation text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Always allow read operations
  IF operation = 'select' THEN
    RETURN true;
  END IF;

  -- Check if user is admin or manager for write operations
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id
    AND (
      raw_user_meta_data->>'role' = 'admin'
      OR (
        raw_user_meta_data->>'role' = 'manager'
        AND operation IN ('insert', 'update')
      )
    )
  );
END;
$$;