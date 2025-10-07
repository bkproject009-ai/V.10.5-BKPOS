-- First create the debugging function
CREATE OR REPLACE FUNCTION public.debug_user_role()
RETURNS TABLE (
    user_id uuid,
    email text,
    role text,
    raw_meta jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id,
        auth.users.email::text,
        raw_user_meta_data->>'role' as role,
        raw_user_meta_data
    FROM auth.users
    WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin check function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_role text;
BEGIN
    SELECT raw_user_meta_data->>'role'
    INTO user_role
    FROM auth.users
    WHERE id = auth.uid();
    
    RETURN COALESCE(user_role = 'admin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text AS $$
DECLARE
    user_role text;
BEGIN
    SELECT raw_user_meta_data->>'role'
    INTO user_role
    FROM auth.users
    WHERE id = auth.uid();
    
    RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now handle the tax_types table policies
ALTER TABLE IF EXISTS tax_types ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'tax_types'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON tax_types', pol.policyname);
    END LOOP;
END $$;

-- Create read policy for all authenticated users
CREATE POLICY "tax_types_read_policy"
ON tax_types FOR SELECT
TO authenticated
USING (true);

-- Create admin policy for all write operations
CREATE POLICY "tax_types_admin_policy"
ON tax_types
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND raw_user_meta_data->>'role' = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND raw_user_meta_data->>'role' = 'admin'
    )
);