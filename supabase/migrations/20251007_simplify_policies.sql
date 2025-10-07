-- First disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE tax_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Drop all functions and triggers that might cause recursion
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_manager() CASCADE;
DROP FUNCTION IF EXISTS public.is_cashier() CASCADE;
DROP FUNCTION IF EXISTS public.check_user_role(text) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_first_user_admin() CASCADE;
DROP FUNCTION IF EXISTS public.set_user_role() CASCADE;
DROP TRIGGER IF EXISTS set_user_role ON users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes ENABLE ROW LEVEL SECURITY;

-- Create direct policies without any function calls
-- Users table policies
CREATE POLICY "users_read_policy" ON users
FOR SELECT TO authenticated USING (true);

CREATE POLICY "users_update_own" ON users
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "users_admin_all" ON users
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Products table policies
CREATE POLICY "products_read" ON products
FOR SELECT TO authenticated USING (true);

CREATE POLICY "products_write" ON products
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Tax types table policies
CREATE POLICY "tax_types_read" ON tax_types
FOR SELECT TO authenticated USING (true);

CREATE POLICY "tax_types_write" ON tax_types
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Sales table policies
CREATE POLICY "sales_read" ON sales
FOR SELECT TO authenticated
USING (
    cashier_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "sales_insert" ON sales
FOR INSERT TO authenticated
WITH CHECK (cashier_id = auth.uid());

-- Sale items policies
CREATE POLICY "sale_items_read" ON sale_items
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM sales
        WHERE id = sale_items.sale_id
        AND (
            cashier_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM users
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    )
);

CREATE POLICY "sale_items_insert" ON sale_items
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales
        WHERE id = sale_items.sale_id
        AND cashier_id = auth.uid()
    )
);

-- Sales taxes policies
CREATE POLICY "sales_taxes_read" ON sales_taxes
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM sales
        WHERE id = sales_taxes.sale_id
        AND (
            cashier_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM users
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    )
);

CREATE POLICY "sales_taxes_insert" ON sales_taxes
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales
        WHERE id = sales_taxes.sale_id
        AND cashier_id = auth.uid()
    )
);

-- Simple trigger for new users (admin if first user, cashier otherwise)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_count int;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    IF user_count = 0 THEN
        NEW.role := 'admin';
    ELSE
        NEW.role := 'cashier';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_user_role
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;