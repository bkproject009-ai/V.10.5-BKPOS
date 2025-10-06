-- Drop all triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- First disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE tax_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
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

DROP POLICY IF EXISTS "read_products" ON products;
DROP POLICY IF EXISTS "admin_manage_products" ON products;
DROP POLICY IF EXISTS "Enable read products" ON products;
DROP POLICY IF EXISTS "Enable admin write products" ON products;
DROP POLICY IF EXISTS "products_read_policy" ON products;
DROP POLICY IF EXISTS "products_admin_policy" ON products;

DROP POLICY IF EXISTS "read_tax_types" ON tax_types;
DROP POLICY IF EXISTS "admin_manage_tax_types" ON tax_types;
DROP POLICY IF EXISTS "Enable read tax_types" ON tax_types;
DROP POLICY IF EXISTS "Enable admin write tax_types" ON tax_types;
DROP POLICY IF EXISTS "tax_types_read_policy" ON tax_types;
DROP POLICY IF EXISTS "tax_types_admin_policy" ON tax_types;

DROP POLICY IF EXISTS "view_sales" ON sales;
DROP POLICY IF EXISTS "create_sales" ON sales;
DROP POLICY IF EXISTS "Enable cashier sales" ON sales;
DROP POLICY IF EXISTS "View own sales or admin view all" ON sales;
DROP POLICY IF EXISTS "sales_view_policy" ON sales;
DROP POLICY IF EXISTS "sales_insert_policy" ON sales;

DROP POLICY IF EXISTS "view_sale_items" ON sale_items;
DROP POLICY IF EXISTS "create_sale_items" ON sale_items;
DROP POLICY IF EXISTS "Enable sale items for own sales" ON sale_items;
DROP POLICY IF EXISTS "View sale items for own sales or admin" ON sale_items;
DROP POLICY IF EXISTS "sale_items_view_policy" ON sale_items;
DROP POLICY IF EXISTS "sale_items_insert_policy" ON sale_items;

DROP POLICY IF EXISTS "view_sales_taxes" ON sales_taxes;
DROP POLICY IF EXISTS "create_sales_taxes" ON sales_taxes;
DROP POLICY IF EXISTS "Enable sales taxes for own sales" ON sales_taxes;
DROP POLICY IF EXISTS "View sales taxes for own sales or admin" ON sales_taxes;
DROP POLICY IF EXISTS "sales_taxes_view_policy" ON sales_taxes;
DROP POLICY IF EXISTS "sales_taxes_insert_policy" ON sales_taxes;

-- Drop old role check functions
DROP FUNCTION IF EXISTS check_user_role(text);
DROP FUNCTION IF EXISTS check_user_role();
DROP FUNCTION IF EXISTS check_user_role_v2(text);
DROP FUNCTION IF EXISTS check_user_role_v3(text);

-- Create improved role check function
CREATE OR REPLACE FUNCTION public.check_user_role_v4(required_role text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid()
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

-- Simplified read policies for authenticated users
CREATE POLICY "users_read_v4"
ON users FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "products_read_v4"
ON products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "tax_types_read_v4"
ON tax_types FOR SELECT
TO authenticated
USING (true);

-- Admin write policies
CREATE POLICY "products_admin_write_v4"
ON products 
FOR INSERT
TO authenticated
WITH CHECK (public.check_user_role_v4('admin'));

CREATE POLICY "products_admin_update_v4"
ON products 
FOR UPDATE
TO authenticated
USING (public.check_user_role_v4('admin'))
WITH CHECK (public.check_user_role_v4('admin'));

CREATE POLICY "products_admin_delete_v4"
ON products 
FOR DELETE
TO authenticated
USING (public.check_user_role_v4('admin'));

-- Tax types admin policies
CREATE POLICY "tax_types_admin_write_v4"
ON tax_types 
FOR INSERT
TO authenticated
WITH CHECK (public.check_user_role_v4('admin'));

CREATE POLICY "tax_types_admin_update_v4"
ON tax_types 
FOR UPDATE
TO authenticated
USING (public.check_user_role_v4('admin'))
WITH CHECK (public.check_user_role_v4('admin'));

CREATE POLICY "tax_types_admin_delete_v4"
ON tax_types 
FOR DELETE
TO authenticated
USING (public.check_user_role_v4('admin'));

-- Users admin policies
CREATE POLICY "users_admin_write_v4"
ON users 
FOR INSERT
TO authenticated
WITH CHECK (public.check_user_role_v4('admin'));

CREATE POLICY "users_admin_update_v4"
ON users 
FOR UPDATE
TO authenticated
USING (
    id = auth.uid() OR 
    public.check_user_role_v4('admin')
)
WITH CHECK (
    id = auth.uid() OR 
    public.check_user_role_v4('admin')
);

CREATE POLICY "users_admin_delete_v4"
ON users 
FOR DELETE
TO authenticated
USING (public.check_user_role_v4('admin'));

-- Sales policies
CREATE POLICY "sales_read_v4"
ON sales FOR SELECT
TO authenticated
USING (
    cashier_id = auth.uid() OR
    public.check_user_role_v4('admin')
);

CREATE POLICY "sales_write_v4"
ON sales 
FOR INSERT
TO authenticated
WITH CHECK (
    cashier_id = auth.uid() AND
    (public.check_user_role_v4('admin') OR public.check_user_role_v4('cashier'))
);

-- Sale items policies
CREATE POLICY "sale_items_read_v4"
ON sale_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = sale_items.sale_id
        AND (s.cashier_id = auth.uid() OR public.check_user_role_v4('admin'))
    )
);

CREATE POLICY "sale_items_write_v4"
ON sale_items 
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = sale_items.sale_id
        AND s.cashier_id = auth.uid()
        AND (public.check_user_role_v4('admin') OR public.check_user_role_v4('cashier'))
    )
);

-- Sales taxes policies
CREATE POLICY "sales_taxes_read_v4"
ON sales_taxes FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = sales_taxes.sale_id
        AND (s.cashier_id = auth.uid() OR public.check_user_role_v4('admin'))
    )
);

CREATE POLICY "sales_taxes_write_v4"
ON sales_taxes 
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales s
        WHERE s.id = sales_taxes.sale_id
        AND s.cashier_id = auth.uid()
        AND (public.check_user_role_v4('admin') OR public.check_user_role_v4('cashier'))
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

-- Ensure proper grants
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_role_v4(text) TO authenticated;