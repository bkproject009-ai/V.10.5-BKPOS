-- Drop existing policies
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable insert access for admin users" ON products;
DROP POLICY IF EXISTS "Enable update access for admin users" ON products;
DROP POLICY IF EXISTS "Enable delete access for admin users" ON products;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON products;

-- Create new admin-only policies
CREATE POLICY "Enable insert access for admin users"
ON products FOR INSERT
TO authenticated
WITH CHECK (auth.jwt() ->> 'role' = 'admin' OR 
           (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin' OR
           (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin');

CREATE POLICY "Enable update access for admin users"
ON products FOR UPDATE
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin' OR 
       (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin' OR
       (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin' OR 
           (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin' OR
           (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin');

CREATE POLICY "Enable delete access for admin users"
ON products FOR DELETE
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin' OR 
       (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'admin' OR
       (auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin');

-- Allow read access for all authenticated users
CREATE POLICY "Enable read access for authenticated users"
ON products FOR SELECT
TO authenticated
USING (true);