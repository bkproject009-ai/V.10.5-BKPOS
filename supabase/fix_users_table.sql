-- Fix users table structure and policies
BEGIN;

-- 1. Add missing columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user',
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- 2. Drop all existing policies
DROP POLICY IF EXISTS "Enable read access for own user" ON users;
DROP POLICY IF EXISTS "Enable update access for own user" ON users;
DROP POLICY IF EXISTS "Read access for all authenticated users" ON users;
DROP POLICY IF EXISTS "Modify access for admin users" ON users;
DROP POLICY IF EXISTS "Update access for admin and own user" ON users;
DROP POLICY IF EXISTS "Users read policy" ON users;
DROP POLICY IF EXISTS "Users update policy" ON users;

-- 3. Create new simplified policies
CREATE POLICY "users_select_policy" ON public.users
FOR SELECT TO authenticated
USING (true);  -- Allow all authenticated users to read all user data

CREATE POLICY "users_update_policy" ON public.users
FOR UPDATE TO authenticated
USING (
    auth.uid() = id  -- Can update own record
    OR 
    EXISTS (        -- Or is admin
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    auth.uid() = id
    OR 
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 4. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Ensure proper grants
GRANT SELECT, UPDATE ON public.users TO authenticated;

-- 6. Create update timestamp function and trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

COMMIT;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Show policies
SELECT * FROM pg_policies WHERE tablename = 'users';