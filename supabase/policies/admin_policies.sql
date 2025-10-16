-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Categories Policies
CREATE POLICY "Hanya admin yang bisa insert kategori" ON categories
FOR INSERT WITH CHECK (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
);

CREATE POLICY "Hanya admin yang bisa update kategori" ON categories
FOR UPDATE USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
);

CREATE POLICY "Hanya admin yang bisa delete kategori" ON categories
FOR DELETE USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
);

CREATE POLICY "Semua bisa view kategori" ON categories
FOR SELECT USING (true);

-- Products Policies
CREATE POLICY "Hanya admin yang bisa insert produk" ON products
FOR INSERT WITH CHECK (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
);

CREATE POLICY "Hanya admin yang bisa update produk" ON products
FOR UPDATE USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
);

CREATE POLICY "Hanya admin yang bisa delete produk" ON products
FOR DELETE USING (
  auth.uid() IN (
    SELECT id FROM users WHERE role = 'admin'
  )
);

CREATE POLICY "Semua bisa view produk" ON products
FOR SELECT USING (true);