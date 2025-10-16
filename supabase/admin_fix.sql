-- Cek dan update role admin
DO $$
DECLARE
    v_user_id uuid;
    v_exists boolean;
BEGIN
    -- Cek apakah user dengan email tersebut ada di auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'fadlannafian@gmail.com';

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User dengan email tersebut tidak ditemukan di auth.users';
        RETURN;
    END IF;

    -- Cek apakah user sudah ada di public.users
    SELECT EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = v_user_id
    ) INTO v_exists;

    IF NOT v_exists THEN
        -- Insert new user jika belum ada
        INSERT INTO public.users (id, email, role)
        VALUES (v_user_id, 'fadlannafian@gmail.com', 'admin');
        RAISE NOTICE 'User baru ditambahkan dengan role admin';
    ELSE
        -- Update existing user
        UPDATE public.users
        SET role = 'admin'
        WHERE id = v_user_id;
        RAISE NOTICE 'Role user diupdate menjadi admin';
    END IF;

    -- Verifikasi update
    RAISE NOTICE 'Status user setelah update:';
    RAISE NOTICE '%', (
        SELECT json_build_object(
            'user_id', u.id,
            'email', u.email,
            'role', u.role
        )
        FROM public.users u
        WHERE u.id = v_user_id
    );
END $$;