-- First, let's check and log the current state
DO $$
DECLARE
    user_id uuid;
    current_meta jsonb;
BEGIN
    -- Get the user ID for the email
    SELECT id, raw_user_meta_data
    INTO user_id, current_meta
    FROM auth.users
    WHERE email = 'fadlannafian@gmail.com';

    -- Log the current state
    RAISE NOTICE 'Current user ID: %, Current metadata: %', user_id, current_meta;

    -- Update the user's metadata to include admin role
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_build_object(
        'role', 'admin'
    )
    WHERE id = user_id;

    -- Verify the update
    SELECT raw_user_meta_data
    INTO current_meta
    FROM auth.users
    WHERE id = user_id;

    -- Log the new state
    RAISE NOTICE 'Updated metadata: %', current_meta;
END $$;

-- Grant necessary permissions
GRANT ALL ON tax_types TO authenticated;
GRANT USAGE ON SEQUENCE tax_types_id_seq TO authenticated;