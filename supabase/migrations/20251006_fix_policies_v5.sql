-- Drop all triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- First disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE tax_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies and functions
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for own user" ON users;
DROP POLICY IF EXISTS "read_users" ON users;
DROP POLICY IF EXISTS "admin_manage_users" ON users;
DROP POLICY IF EXISTS "update_own_profile" ON users;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable admin manage users" ON users;
DROP POLICY IF EXISTS "users_read_policy" ON users;
DROP POLICY IF EXISTS "users_admin_policy" ON users;
DROP POLICY IF EXISTS "users_self_update_policy" ON users;
DROP POLICY IF EXISTS "users_read_v4" ON users;
DROP POLICY IF EXISTS "users_admin_write_v4" ON users;
DROP POLICY IF EXISTS "users_admin_update_v4" ON users;
DROP POLICY IF EXISTS "users_admin_delete_v4" ON users;

DROP POLICY IF EXISTS "read_products" ON products;
DROP POLICY IF EXISTS "admin_manage_products" ON products;
DROP POLICY IF EXISTS "Enable read products" ON products;
DROP POLICY IF EXISTS "Enable admin write products" ON products;
DROP POLICY IF EXISTS "products_read_policy" ON products;
DROP POLICY IF EXISTS "products_admin_policy" ON products;
DROP POLICY IF EXISTS "products_read_v4" ON products;
DROP POLICY IF EXISTS "products_admin_write_v4" ON products;
DROP POLICY IF EXISTS "products_admin_update_v4" ON products;
DROP POLICY IF EXISTS "products_admin_delete_v4" ON products;

-- ... (similar DROP statements for other policies)

DROP FUNCTION IF EXISTS check_user_role(text);
DROP FUNCTION IF EXISTS check_user_role();
DROP FUNCTION IF EXISTS check_user_role_v2(text);
DROP FUNCTION IF EXISTS check_user_role_v3(text);
DROP FUNCTION IF EXISTS check_user_role_v4(text);

-- Create a simple materialized view for user roles to avoid recursion
CREATE MATERIALIZED VIEW IF NOT EXISTS user_roles AS
SELECT id, role FROM public.users;

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_roles;
    RETURN NULL;
END;
$$;

-- Create trigger to refresh materialized view
CREATE TRIGGER refresh_user_roles_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_user_roles();

-- Create a new role check function that uses the materialized view
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_roles
        WHERE id = auth.uid()
        AND role = 'admin'
    );
$$;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes ENABLE ROW LEVEL SECURITY;

-- Simple read-only policies for authenticated users
CREATE POLICY "allow_read_users_v5"
ON users FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "allow_read_products_v5"
ON products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "allow_read_tax_types_v5"
ON tax_types FOR SELECT
TO authenticated
USING (true);

-- Admin write policies using the simplified is_admin() function
CREATE POLICY "allow_admin_write_products_v5"
ON products FOR ALL
TO authenticated
USING (is_admin());

CREATE POLICY "allow_admin_write_tax_types_v5"
ON tax_types FOR ALL
TO authenticated
USING (is_admin());

-- Special users table policies
CREATE POLICY "allow_users_self_or_admin_v5"
ON users
FOR ALL
TO authenticated
USING (
    id = auth.uid() OR
    is_admin()
);

-- Sales policies
CREATE POLICY "allow_sales_read_v5"
ON sales FOR SELECT
TO authenticated
USING (cashier_id = auth.uid() OR is_admin());

CREATE POLICY "allow_sales_write_v5"
ON sales FOR INSERT
TO authenticated
WITH CHECK (cashier_id = auth.uid());

-- Sale items policies
CREATE POLICY "allow_sale_items_read_v5"
ON sale_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = sale_items.sale_id
        AND (s.cashier_id = auth.uid() OR is_admin())
    )
);

CREATE POLICY "allow_sale_items_write_v5"
ON sale_items FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = sale_items.sale_id
        AND s.cashier_id = auth.uid()
    )
);

-- Sales taxes policies
CREATE POLICY "allow_sales_taxes_read_v5"
ON sales_taxes FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = sales_taxes.sale_id
        AND (s.cashier_id = auth.uid() OR is_admin())
    )
);

CREATE POLICY "allow_sales_taxes_write_v5"
ON sales_taxes FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = sales_taxes.sale_id
        AND s.cashier_id = auth.uid()
    )
);

-- Create trigger for new users
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
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Initial refresh of the materialized view
REFRESH MATERIALIZED VIEW user_roles;

-- Ensure proper grants
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT SELECT ON user_roles TO authenticated;