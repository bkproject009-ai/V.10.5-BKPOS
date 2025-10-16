-- Reset dan setup admin user
DO $$ 
DECLARE
    v_user_id uuid := 'b9b1c957-4acc-4ae7-b951-2fab63d567ae';  -- ID dari auth.users
    v_email text := 'fadlannafian@gmail.com';
BEGIN
    -- Delete existing user data if exists
    DELETE FROM public.users WHERE id = v_user_id;
    
    -- Insert fresh admin user data
    INSERT INTO public.users (id, email, role)
    VALUES (v_user_id, v_email, 'admin');
    
    RAISE NOTICE 'Admin user setup complete';
    
    -- Verify the setup
    SELECT json_build_object(
        'auth_user', (SELECT row_to_json(au) FROM auth.users au WHERE au.id = v_user_id),
        'public_user', (SELECT row_to_json(pu) FROM public.users pu WHERE pu.id = v_user_id)
    );
END $$;

-- Verify admin user data
SELECT 
    au.id as auth_user_id,
    au.email as auth_email,
    au.role as auth_role,
    pu.id as public_user_id,
    pu.email as public_email,
    pu.role as user_role
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE au.email = 'fadlannafian@gmail.com';