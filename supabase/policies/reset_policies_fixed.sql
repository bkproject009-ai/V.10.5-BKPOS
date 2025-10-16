-- Hapus SEMUA policies yang ada terlebih dahulu
DO $$ 
DECLARE
    pol record;
BEGIN
    -- Loop through all policies in pg_policies view
    FOR pol IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND (tablename = 'categories' OR tablename = 'products')
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      pol.policyname, 
                      pol.schemaname, 
                      pol.tablename);
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Categories Policies (dengan nama baru)
CREATE POLICY "categories_select_policy" ON categories
FOR SELECT USING (true);

CREATE POLICY "categories_insert_admin_policy" ON categories
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.users u
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
);

CREATE POLICY "categories_update_admin_policy" ON categories
FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 
    FROM public.users u
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
);

CREATE POLICY "categories_delete_admin_policy" ON categories
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 
    FROM public.users u
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
);

-- Products Policies (dengan nama baru)
CREATE POLICY "products_select_policy" ON products
FOR SELECT USING (true);

CREATE POLICY "products_insert_admin_policy" ON products
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.users u
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
);

CREATE POLICY "products_update_admin_policy" ON products
FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 
    FROM public.users u
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
);

CREATE POLICY "products_delete_admin_policy" ON products
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 
    FROM public.users u
    WHERE u.id = auth.uid() 
    AND u.role = 'admin'
  )
);

-- Verifikasi policies yang aktif
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('categories', 'products')
ORDER BY tablename, policyname;