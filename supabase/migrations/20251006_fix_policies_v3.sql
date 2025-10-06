-- Drop all triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- First disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE tax_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies (including those from other migrations)
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable update for own user" ON users;
DROP POLICY IF EXISTS "read_users" ON users;
DROP POLICY IF EXISTS "admin_manage_users" ON users;
DROP POLICY IF EXISTS "update_own_profile" ON users;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable admin manage users" ON users;

DROP POLICY IF EXISTS "read_products" ON products;
DROP POLICY IF EXISTS "admin_manage_products" ON products;
DROP POLICY IF EXISTS "Enable read products" ON products;
DROP POLICY IF EXISTS "Enable admin write products" ON products;

DROP POLICY IF EXISTS "read_tax_types" ON tax_types;
DROP POLICY IF EXISTS "admin_manage_tax_types" ON tax_types;
DROP POLICY IF EXISTS "Enable read tax_types" ON tax_types;
DROP POLICY IF EXISTS "Enable admin write tax_types" ON tax_types;

DROP POLICY IF EXISTS "view_sales" ON sales;
DROP POLICY IF EXISTS "create_sales" ON sales;
DROP POLICY IF EXISTS "Enable cashier sales" ON sales;
DROP POLICY IF EXISTS "View own sales or admin view all" ON sales;

DROP POLICY IF EXISTS "view_sale_items" ON sale_items;
DROP POLICY IF EXISTS "create_sale_items" ON sale_items;
DROP POLICY IF EXISTS "Enable sale items for own sales" ON sale_items;
DROP POLICY IF EXISTS "View sale items for own sales or admin" ON sale_items;

DROP POLICY IF EXISTS "view_sales_taxes" ON sales_taxes;
DROP POLICY IF EXISTS "create_sales_taxes" ON sales_taxes;
DROP POLICY IF EXISTS "Enable sales taxes for own sales" ON sales_taxes;
DROP POLICY IF EXISTS "View sales taxes for own sales or admin" ON sales_taxes;

-- Drop old role check functions
DROP FUNCTION IF EXISTS check_user_role(text);
DROP FUNCTION IF EXISTS check_user_role();
DROP FUNCTION IF EXISTS check_user_role_v2(text);

-- Create new role check function that avoids recursion
CREATE OR REPLACE FUNCTION public.check_user_role_v3(required_role text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
    -- Use a direct SQL query instead of plpgsql to reduce overhead
    SELECT EXISTS (
        SELECT 1
        FROM auth.users au
        JOIN public.users u ON u.id = au.id
        WHERE au.id = auth.uid()
        AND u.role = required_role
    );
$$;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes ENABLE ROW LEVEL SECURITY;

-- Basic read policies for authenticated users
CREATE POLICY "users_read_policy"
ON users FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "products_read_policy"
ON products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "tax_types_read_policy"
ON tax_types FOR SELECT
TO authenticated
USING (true);

-- Admin policies using new function
CREATE POLICY "products_admin_policy"
ON products FOR ALL
TO authenticated
USING (public.check_user_role_v3('admin'));

CREATE POLICY "tax_types_admin_policy"
ON tax_types FOR ALL
TO authenticated
USING (public.check_user_role_v3('admin'));

CREATE POLICY "users_admin_policy"
ON users FOR ALL
TO authenticated
USING (public.check_user_role_v3('admin'));

-- User self-management policy
CREATE POLICY "users_self_update_policy"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Sales policies for both admin and cashier roles
CREATE POLICY "sales_view_policy"
ON sales FOR SELECT
TO authenticated
USING (
    cashier_id = auth.uid() OR
    public.check_user_role_v3('admin')
);

CREATE POLICY "sales_insert_policy"
ON sales FOR INSERT
TO authenticated
WITH CHECK (
    cashier_id = auth.uid() AND
    (public.check_user_role_v3('admin') OR public.check_user_role_v3('cashier'))
);

-- Sale items policies
CREATE POLICY "sale_items_view_policy"
ON sale_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = sale_items.sale_id
        AND (s.cashier_id = auth.uid() OR public.check_user_role_v3('admin'))
    )
);

CREATE POLICY "sale_items_insert_policy"
ON sale_items FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = sale_items.sale_id
        AND s.cashier_id = auth.uid()
        AND (public.check_user_role_v3('admin') OR public.check_user_role_v3('cashier'))
    )
);

-- Sales taxes policies
CREATE POLICY "sales_taxes_view_policy"
ON sales_taxes FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = sales_taxes.sale_id
        AND (s.cashier_id = auth.uid() OR public.check_user_role_v3('admin'))
    )
);

CREATE POLICY "sales_taxes_insert_policy"
ON sales_taxes FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = sales_taxes.sale_id
        AND s.cashier_id = auth.uid()
        AND (public.check_user_role_v3('admin') OR public.check_user_role_v3('cashier'))
    )
);

-- Create trigger for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
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

-- Ensure proper grants
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_role_v3(text) TO authenticated;