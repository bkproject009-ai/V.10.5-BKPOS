-- Insert user ke public.users jika belum ada
INSERT INTO public.users (id, email, role)
VALUES (
  'b9b1c957-4acc-4ae7-b951-2fab63d567ae', 
  'fadlannafian@gmail.com',
  'admin'
)
ON CONFLICT (id) 
DO UPDATE SET role = 'admin'
WHERE public.users.id = 'b9b1c957-4acc-4ae7-b951-2fab63d567ae';

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