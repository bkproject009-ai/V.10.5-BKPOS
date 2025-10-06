-- Reset everything first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS refresh_user_roles_trigger ON public.users;
DROP MATERIALIZED VIEW IF EXISTS user_roles;
DROP FUNCTION IF EXISTS check_user_role(text) CASCADE;
DROP FUNCTION IF EXISTS check_user_role() CASCADE;
DROP FUNCTION IF EXISTS check_user_role_v2(text) CASCADE;
DROP FUNCTION IF EXISTS check_user_role_v3(text) CASCADE;
DROP FUNCTION IF EXISTS check_user_role_v4(text) CASCADE;
DROP FUNCTION IF EXISTS refresh_user_roles() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.check_is_admin() CASCADE;

-- Disable RLS temporarily
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

-- Create super simple admin check function
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS boolean 
LANGUAGE sql SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes ENABLE ROW LEVEL SECURITY;

-- Create basic read policies
CREATE POLICY "allow_select_users" ON users FOR SELECT USING (true);
CREATE POLICY "allow_select_products" ON products FOR SELECT USING (true);
CREATE POLICY "allow_select_tax_types" ON tax_types FOR SELECT USING (true);

-- Admin policies
CREATE POLICY "allow_all_if_admin_products" ON products 
FOR ALL USING (public.is_admin());

CREATE POLICY "allow_all_if_admin_tax_types" ON tax_types 
FOR ALL USING (public.is_admin());

CREATE POLICY "allow_all_if_admin_or_self_users" ON users 
FOR ALL USING (id = auth.uid() OR public.is_admin());

-- Sales related policies
CREATE POLICY "allow_select_sales" ON sales 
FOR SELECT USING (cashier_id = auth.uid() OR public.is_admin());

CREATE POLICY "allow_insert_sales" ON sales 
FOR INSERT WITH CHECK (cashier_id = auth.uid());

CREATE POLICY "allow_select_sale_items" ON sale_items 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = sale_items.sale_id
        AND (s.cashier_id = auth.uid() OR public.is_admin())
    )
);

CREATE POLICY "allow_insert_sale_items" ON sale_items 
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = sale_items.sale_id
        AND s.cashier_id = auth.uid()
    )
);

CREATE POLICY "allow_select_sales_taxes" ON sales_taxes 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = sales_taxes.sale_id
        AND (s.cashier_id = auth.uid() OR public.is_admin())
    )
);

CREATE POLICY "allow_insert_sales_taxes" ON sales_taxes 
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = sales_taxes.sale_id
        AND s.cashier_id = auth.uid()
    )
);

-- Create simple user creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;