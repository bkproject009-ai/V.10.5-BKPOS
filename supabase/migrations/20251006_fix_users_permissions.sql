-- Drop existing RLS policies on users table
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own record during registration
CREATE POLICY "Enable insert for registration"
    ON users FOR INSERT
    TO public
    WITH CHECK (auth.uid() = id);

-- Allow users to read their own profile and admin can read all
CREATE POLICY "Enable read access for users"
    ON users FOR SELECT
    TO authenticated
    USING (
        auth.uid() = id 
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- Allow users to update their own profile and admin can update all
CREATE POLICY "Enable update for users"
    ON users FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = id 
        OR auth.jwt() ->> 'role' = 'admin'
    )
    WITH CHECK (
        auth.uid() = id 
        OR auth.jwt() ->> 'role' = 'admin'
    );

-- Only admin can delete users
CREATE POLICY "Enable delete for admin"
    ON users FOR DELETE
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

-- Create function to ensure first user is admin and others are cashier
CREATE OR REPLACE FUNCTION set_user_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this is the first user
    IF (SELECT COUNT(*) FROM users) = 0 THEN
        NEW.role := 'admin';
    ELSE
        NEW.role := 'cashier';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set role
DROP TRIGGER IF EXISTS set_user_role_trigger ON users;
CREATE TRIGGER set_user_role_trigger
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_user_role();