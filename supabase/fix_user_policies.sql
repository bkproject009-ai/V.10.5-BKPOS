-- Drop ALL existing policies for users table
DROP POLICY IF EXISTS "Enable read access for own user" ON users;
DROP POLICY IF EXISTS "Enable update access for own user" ON users;
DROP POLICY IF EXISTS "Read access for all authenticated users" ON users;
DROP POLICY IF EXISTS "Modify access for admin users" ON users;
DROP POLICY IF EXISTS "Update access for admin and own user" ON users;

-- Create new policies for user table
CREATE POLICY "Users read policy"
ON public.users
FOR SELECT
TO authenticated
USING (
    -- Allow admins to read all users
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    )
    -- Allow users to read basic info of all users
    OR true
);

CREATE POLICY "Users update policy"
ON public.users
FOR UPDATE
TO authenticated
USING (
    -- Allow admins to update any user
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    )
    -- Allow users to update their own data
    OR auth.uid() = id
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    )
    OR auth.uid() = id
);

-- Verify that RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT ON public.users TO authenticated;
GRANT UPDATE ON public.users TO authenticated;