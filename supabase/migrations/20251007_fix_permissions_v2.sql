-- First, completely disable RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE tax_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes DISABLE ROW LEVEL SECURITY;

-- Drop everything that might cause issues
DO $$ 
BEGIN
    -- Drop all policies
    EXECUTE (
        SELECT string_agg(
            format('DROP POLICY IF EXISTS %I ON %I.%I;',
                   policyname, schemaname, tablename),
            E'\n'
        )
        FROM pg_policies
        WHERE schemaname = 'public'
    );

    -- Drop all functions
    EXECUTE (
        SELECT string_agg(
            format('DROP FUNCTION IF EXISTS %I.%I CASCADE;',
                   nspname, proname),
            E'\n'
        )
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE nspname = 'public'
    );
END $$;

-- Drop specific triggers
DROP TRIGGER IF EXISTS set_user_role ON users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes ENABLE ROW LEVEL SECURITY;

-- Basic read-only policies for authenticated users
CREATE POLICY "allow_read_users" ON users
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "allow_read_products" ON products
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "allow_read_tax_types" ON tax_types
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "allow_read_sales" ON sales
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "allow_read_sale_items" ON sale_items
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "allow_read_sales_taxes" ON sales_taxes
FOR SELECT TO authenticated
USING (true);

-- Basic write policies for admin users
CREATE POLICY "allow_write_users" ON users
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.uid() = id
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

CREATE POLICY "allow_write_products" ON products
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.uid() = id
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

CREATE POLICY "allow_write_tax_types" ON tax_types
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.uid() = id
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

-- Allow users to create their own sales
CREATE POLICY "allow_create_sales" ON sales
FOR INSERT TO authenticated
WITH CHECK (cashier_id = auth.uid());

CREATE POLICY "allow_create_sale_items" ON sale_items
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales
        WHERE id = sale_items.sale_id
        AND cashier_id = auth.uid()
    )
);

CREATE POLICY "allow_create_sales_taxes" ON sales_taxes
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales
        WHERE id = sales_taxes.sale_id
        AND cashier_id = auth.uid()
    )
);

-- Grant basic permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;