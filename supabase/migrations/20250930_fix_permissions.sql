-- Create settings table if not exists
CREATE TABLE IF NOT EXISTS settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    key text NOT NULL UNIQUE,
    value jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on settings
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users on settings
CREATE POLICY "Allow authenticated users to read settings"
    ON settings FOR SELECT
    TO authenticated
    USING (true);

-- Restrict tax_types to admin and manager
DROP POLICY IF EXISTS "Enable access for admin and manager on tax_types" ON tax_types;

CREATE POLICY "Enable access for admin and manager on tax_types"
    ON tax_types FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'manager'))
    WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'manager'));

-- Insert some default settings
INSERT INTO settings (key, value) VALUES
    ('store_name', '"My Store"'::jsonb),
    ('currency', '"IDR"'::jsonb),
    ('tax_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Verify role assignments function
CREATE OR REPLACE FUNCTION check_user_role(user_id uuid, required_role text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM auth.users u
        WHERE u.id = user_id
        AND u.raw_user_meta_data->>'role' = required_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;