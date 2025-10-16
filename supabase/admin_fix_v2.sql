-- Script untuk memastikan user admin
DO $$
DECLARE
    v_auth_uid uuid := 'b9b1c957-4acc-4ae7-b951-2fab63d567ae';
    v_email text := 'fadlannafian@gmail.com';
    v_user_exists boolean;
BEGIN
    -- 1. Pastikan tabel users ada dan strukturnya benar
    CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY,
        email TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
        updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
    );

    -- 2. Hapus data yang mungkin duplikat
    DELETE FROM public.users WHERE email = v_email AND id != v_auth_uid;
    
    -- 3. Tambah atau update user admin
    INSERT INTO public.users (id, email, role)
    VALUES (v_auth_uid, v_email, 'admin')
    ON CONFLICT (id) DO UPDATE
    SET 
        role = 'admin',
        email = v_email,
        updated_at = TIMEZONE('utc'::text, NOW());

    -- 4. Verifikasi
    RAISE NOTICE 'Admin user data:';
    RAISE NOTICE '%', (
        SELECT row_to_json(t)
        FROM (
            SELECT id, email, role, created_at, updated_at
            FROM public.users
            WHERE id = v_auth_uid
        ) t
    );

END $$;

-- Pastikan RLS diaktifkan
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Reset dan buat ulang policies
DROP POLICY IF EXISTS "Read access for all authenticated users" ON public.users;
DROP POLICY IF EXISTS "Modify access for admin users" ON public.users;

-- Policy baru yang lebih sederhana
CREATE POLICY "Read access for all authenticated users"
ON public.users FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Modify access for admin users"
ON public.users FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    )
    OR auth.uid() = id
);

-- Verifikasi final
SELECT 
    au.id as auth_user_id,
    au.email as auth_email,
    pu.id as public_user_id,
    pu.email as public_email,
    pu.role as user_role,
    pu.created_at,
    pu.updated_at
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE au.email = 'fadlannafian@gmail.com';