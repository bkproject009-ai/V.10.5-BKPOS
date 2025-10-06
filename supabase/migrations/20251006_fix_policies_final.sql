-- First disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE tax_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Enable read for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable read products" ON products;
DROP POLICY IF EXISTS "Enable read tax_types" ON tax_types;
DROP POLICY IF EXISTS "Enable admin write products" ON products;
DROP POLICY IF EXISTS "Enable admin write tax_types" ON tax_types;
DROP POLICY IF EXISTS "Enable admin manage users" ON users;
DROP POLICY IF EXISTS "Enable cashier sales" ON sales;
DROP POLICY IF EXISTS "View own sales or admin view all" ON sales;
DROP POLICY IF EXISTS "Enable sale items for own sales" ON sale_items;
DROP POLICY IF EXISTS "View sale items for own sales or admin" ON sale_items;
DROP POLICY IF EXISTS "Enable sales taxes for own sales" ON sales_taxes;
DROP POLICY IF EXISTS "View sales taxes for own sales or admin" ON sales_taxes;

-- Create role check function that doesn't cause recursion
CREATE OR REPLACE FUNCTION check_user_role(required_role text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    -- Use a direct query without recursion
    RETURN EXISTS (
        SELECT 1
        FROM users u
        WHERE u.id = auth.uid()
        AND u.role = required_role
    );
END;
$$;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes ENABLE ROW LEVEL SECURITY;

-- Basic read policies (non-recursive)
CREATE POLICY "read_users"
ON users FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "read_products"
ON products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "read_tax_types"
ON tax_types FOR SELECT
TO authenticated
USING (true);

-- Admin policies using the new function
CREATE POLICY "admin_manage_products"
ON products FOR ALL
TO authenticated
USING (check_user_role('admin'));

CREATE POLICY "admin_manage_tax_types"
ON tax_types FOR ALL
TO authenticated
USING (check_user_role('admin'));

CREATE POLICY "admin_manage_users"
ON users FOR ALL
TO authenticated
USING (check_user_role('admin'));

-- Sales policies
CREATE POLICY "view_sales"
ON sales FOR SELECT
TO authenticated
USING (
    cashier_id = auth.uid() OR
    check_user_role('admin')
);

CREATE POLICY "create_sales"
ON sales FOR INSERT
TO authenticated
WITH CHECK (cashier_id = auth.uid());

-- Sale items policies
CREATE POLICY "view_sale_items"
ON sale_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM sales
        WHERE id = sale_items.sale_id
        AND (cashier_id = auth.uid() OR check_user_role('admin'))
    )
);

CREATE POLICY "create_sale_items"
ON sale_items FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales
        WHERE id = sale_items.sale_id
        AND cashier_id = auth.uid()
    )
);

-- Sales taxes policies
CREATE POLICY "view_sales_taxes"
ON sales_taxes FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM sales
        WHERE id = sales_taxes.sale_id
        AND (cashier_id = auth.uid() OR check_user_role('admin'))
    )
);

CREATE POLICY "create_sales_taxes"
ON sales_taxes FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales
        WHERE id = sales_taxes.sale_id
        AND cashier_id = auth.uid()
    )
);

-- Update policy for users to manage their own profile
CREATE POLICY "update_own_profile"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Ensure proper grants
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_role TO authenticated;