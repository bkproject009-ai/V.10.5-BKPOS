-- Reset all policies
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON %I', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Enable read access for authenticated users" ON %I', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Enable update for users based on id" ON %I', r.tablename);
        EXECUTE format('DROP POLICY IF EXISTS "Enable all access for authenticated users" ON %I', r.tablename);
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
END $$;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes ENABLE ROW LEVEL SECURITY;

-- Basic policies for all tables
CREATE POLICY "Enable read for authenticated users" ON users
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON users
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON users
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON users
    FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable all for authenticated users" ON tax_types
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable all for authenticated users" ON sales
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable all for authenticated users" ON sale_items
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable all for authenticated users" ON products
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable all for authenticated users" ON sales_taxes
    FOR ALL TO authenticated USING (true);

-- Function to handle first user as admin
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin') THEN
        NEW.role = 'admin';
    ELSE
        NEW.role = 'cashier';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user role assignment
DROP TRIGGER IF EXISTS set_user_role ON users;
CREATE TRIGGER set_user_role
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Update user functions
CREATE OR REPLACE FUNCTION public.get_user_role(uid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM users WHERE id = uid;
$$;

-- Refresh schemas
SELECT pg_catalog.set_config('search_path', 'public', false);