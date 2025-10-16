-- Drop dan buat ulang tabel users
DROP TABLE IF EXISTS public.users CASCADE;

-- Buat tabel users
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'user',
    full_name TEXT,
    phone_number TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS pada tabel users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Buat policy untuk users
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Admin can view all data" ON public.users
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u 
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- Insert admin user
INSERT INTO public.users (id, email, role)
VALUES (
    'b9b1c957-4acc-4ae7-b951-2fab63d567ae',  -- ID dari auth.users
    'fadlannafian@gmail.com',
    'admin'
) ON CONFLICT (id) DO UPDATE 
SET role = 'admin',
    updated_at = TIMEZONE('utc'::text, NOW())
RETURNING *;

-- Verifikasi data
SELECT 
    au.id as auth_user_id,
    au.email as auth_email,
    pu.id as public_user_id,
    pu.email as public_email,
    pu.role as user_role
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE au.email = 'fadlannafian@gmail.com';