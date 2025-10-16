-- Implementation of user management system
BEGIN;

-- 1. Make sure users table exists with all needed columns
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL,
    username TEXT,
    full_name TEXT,
    phone_number TEXT,
    address TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. Function to handle user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, role)
    VALUES (NEW.id, NEW.email, 'user')
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger for new auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Drop all existing policies
DROP POLICY IF EXISTS "Enable read access for own user" ON users;
DROP POLICY IF EXISTS "Enable update access for own user" ON users;
DROP POLICY IF EXISTS "Read access for all authenticated users" ON users;
DROP POLICY IF EXISTS "Modify access for admin users" ON users;
DROP POLICY IF EXISTS "Update access for admin and own user" ON users;
DROP POLICY IF EXISTS "Users read policy" ON users;
DROP POLICY IF EXISTS "Users update policy" ON users;

-- 5. Create new simplified policies
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

-- 6. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 7. Ensure proper grants
GRANT SELECT, UPDATE ON public.users TO authenticated;

-- 8. Create update timestamp function and trigger
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

-- 9. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 10. Ensure admin user exists
DO $$
DECLARE
    v_auth_uid uuid := 'b9b1c957-4acc-4ae7-b951-2fab63d567ae';  -- Your admin user ID
    v_email text := 'fadlannafian@gmail.com';  -- Your admin email
BEGIN
    -- Insert or update admin user
    INSERT INTO public.users (id, email, role)
    VALUES (v_auth_uid, v_email, 'admin')
    ON CONFLICT (id) DO UPDATE
    SET 
        role = 'admin',
        email = v_email,
        updated_at = TIMEZONE('utc'::text, NOW());
END $$;

-- 11. Sync existing auth users
INSERT INTO public.users (id, email, role)
SELECT 
    id,
    email,
    'user' as role
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
);

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

-- Show admin users
SELECT id, email, role, created_at, updated_at
FROM public.users
WHERE role = 'admin';