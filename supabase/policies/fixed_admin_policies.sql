-- Hapus policies yang ada terlebih dahulu
DROP POLICY IF EXISTS "Hanya admin yang bisa insert kategori" ON categories;
DROP POLICY IF EXISTS "Hanya admin yang bisa update kategori" ON categories;
DROP POLICY IF EXISTS "Hanya admin yang bisa delete kategori" ON categories;
DROP POLICY IF EXISTS "Semua bisa view kategori" ON categories;
DROP POLICY IF EXISTS "Hanya admin yang bisa insert produk" ON products;
DROP POLICY IF EXISTS "Hanya admin yang bisa update produk" ON products;
DROP POLICY IF EXISTS "Hanya admin yang bisa delete produk" ON products;
DROP POLICY IF EXISTS "Semua bisa view produk" ON products;

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Categories Policies
CREATE POLICY "Enable read access for all users" ON categories
FOR SELECT USING (true);

CREATE POLICY "Enable insert for admin users" ON categories
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

CREATE POLICY "Enable update for admin users" ON categories
FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

CREATE POLICY "Enable delete for admin users" ON categories
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Products Policies
CREATE POLICY "Enable read access for all users" ON products
FOR SELECT USING (true);

CREATE POLICY "Enable insert for admin users" ON products
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

CREATE POLICY "Enable update for admin users" ON products
FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

CREATE POLICY "Enable delete for admin users" ON products
FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);