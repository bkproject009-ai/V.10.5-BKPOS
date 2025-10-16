-- Check and set admin role
DO $$
DECLARE
    user_id uuid;
BEGIN
    -- Get user ID
    SELECT id INTO user_id
    FROM users
    WHERE email = 'fadlannafian@gmail.com';

    -- If user exists
    IF user_id IS NOT NULL THEN
        -- Update role to admin
        UPDATE users
        SET role = 'admin'
        WHERE id = user_id;
        
        RAISE NOTICE 'User role updated to admin';
    ELSE
        RAISE NOTICE 'User not found';
    END IF;
END $$;