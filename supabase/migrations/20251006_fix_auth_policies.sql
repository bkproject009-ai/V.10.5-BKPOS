-- Reset existing policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for users based on id" ON users;

-- Add new policies
CREATE POLICY "Allow self-registration"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow users to read own profile"
ON users FOR SELECT
USING (
    auth.uid() = id 
    OR EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

CREATE POLICY "Allow users to update own profile"
ON users FOR UPDATE
USING (
    auth.uid() = id 
    OR EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'admin'
    )
)
WITH CHECK (
    auth.uid() = id 
    OR EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

CREATE POLICY "Allow admin to delete users"
ON users FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Function to check if this is the first user
CREATE OR REPLACE FUNCTION is_first_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (SELECT 1 FROM users);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set role before insert
CREATE OR REPLACE FUNCTION before_insert_user()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT is_first_user()) THEN
        NEW.role := 'admin';
    ELSE
        NEW.role := 'cashier';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS set_user_role_trigger ON users;
CREATE TRIGGER set_user_role_trigger
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION before_insert_user();

-- Grant necessary permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO anon;