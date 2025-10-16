-- Hapus SEMUA policies yang ada terlebih dahulu
DROP POLICY IF EXISTS "Enable read access for all users" ON categories;
DROP POLICY IF EXISTS "Enable insert for admin users" ON categories;
DROP POLICY IF EXISTS "Enable update for admin users" ON categories;
DROP POLICY IF EXISTS "Enable delete for admin users" ON categories;
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable insert for admin users" ON products;
DROP POLICY IF EXISTS "Enable update for admin users" ON products;
DROP POLICY IF EXISTS "Enable delete for admin users" ON products;
DROP POLICY IF EXISTS "Hanya admin yang bisa insert kategori" ON categories;
DROP POLICY IF EXISTS "Hanya admin yang bisa update kategori" ON categories;
DROP POLICY IF EXISTS "Hanya admin yang bisa delete kategori" ON categories;
DROP POLICY IF EXISTS "Semua bisa view kategori" ON categories;
DROP POLICY IF EXISTS "Hanya admin yang bisa insert produk" ON products;
DROP POLICY IF EXISTS "Hanya admin yang bisa update produk" ON products;
DROP POLICY IF EXISTS "Hanya admin yang bisa delete produk" ON products;
DROP POLICY IF EXISTS "Semua bisa view produk" ON products;

-- Hapus semua policy yang ada di tabel
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'categories' OR tablename = 'products'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
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
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('categories', 'products')
ORDER BY tablename, policyname;