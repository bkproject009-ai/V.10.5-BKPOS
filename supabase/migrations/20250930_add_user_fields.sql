-- Menambahkan kolom baru ke tabel users
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Membuat indeks untuk username untuk pencarian yang lebih cepat
CREATE INDEX IF NOT EXISTS users_username_idx ON users (username);

-- Hapus constraint lama jika ada
ALTER TABLE users 
  DROP CONSTRAINT IF EXISTS username_length,
  DROP CONSTRAINT IF EXISTS username_format,
  DROP CONSTRAINT IF EXISTS phone_number_format;

-- Menambahkan validasi untuk username
ALTER TABLE users
  ADD CONSTRAINT username_length CHECK (char_length(username) >= 3),
  ADD CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_-]+$');

-- Menambahkan validasi untuk nomor telepon
ALTER TABLE users
  ADD CONSTRAINT phone_number_format CHECK (phone_number ~ '^[0-9+]+$');

-- Membuat kebijakan RLS baru untuk kolom baru
DROP POLICY IF EXISTS "Enable read access for own user" ON public.users;
DROP POLICY IF EXISTS "Enable update access for own user" ON public.users;

CREATE POLICY "Enable read access for own user"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Enable update access for own user"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Username dibiarkan nullable dulu untuk memudahkan migrasi data
-- Nanti setelah data dimigrasi, bisa diubah menjadi NOT NULL dengan command:
-- ALTER TABLE users ALTER COLUMN username SET NOT NULL;

COMMENT ON COLUMN users.username IS 'Username untuk login, harus unik dan minimal 3 karakter';
COMMENT ON COLUMN users.phone_number IS 'Nomor telepon pengguna';
COMMENT ON COLUMN users.address IS 'Alamat lengkap pengguna';