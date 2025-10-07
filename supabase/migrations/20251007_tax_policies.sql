-- First drop any existing policies
DROP POLICY IF EXISTS "tax_types_admin_insert" ON tax_types;
DROP POLICY IF EXISTS "tax_types_admin_update" ON tax_types;
DROP POLICY IF EXISTS "tax_types_admin_delete" ON tax_types;
DROP POLICY IF EXISTS "tax_types_auth_select" ON tax_types;

-- Create policies for tax_types table
CREATE POLICY "tax_types_admin_insert" ON tax_types
FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "tax_types_admin_update" ON tax_types
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "tax_types_admin_delete" ON tax_types
FOR DELETE TO authenticated
USING (public.is_admin());

CREATE POLICY "tax_types_auth_select" ON tax_types
FOR SELECT TO authenticated
USING (true);

-- Make sure RLS is enabled
ALTER TABLE tax_types ENABLE ROW LEVEL SECURITY;