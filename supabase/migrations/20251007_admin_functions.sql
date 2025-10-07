-- Drop the existing function first
DROP FUNCTION IF EXISTS update_user_role(UUID, TEXT);

-- Create the new function with updated return type
CREATE OR REPLACE FUNCTION update_user_role(target_user_id UUID, new_role TEXT)
RETURNS json AS $$
DECLARE
    calling_user_role TEXT;
    target_user_data json;
    admin_count INT;
    result json;
BEGIN
    -- Check if the calling user is an admin
    SELECT raw_user_meta_data->>'role'
    INTO calling_user_role
    FROM auth.users
    WHERE id = auth.uid();

    -- Get target user's current data
    SELECT json_build_object(
        'id', id,
        'email', email,
        'role', COALESCE(raw_user_meta_data->>'role', 'user')
    ) INTO target_user_data
    FROM auth.users
    WHERE id = target_user_id;

    -- Count current admins
    SELECT COUNT(*) 
    INTO admin_count
    FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'admin';

    -- Only allow admins to update roles
    IF calling_user_role != 'admin' THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Hanya admin yang dapat mengubah role pengguna'
        );
    END IF;

    -- Prevent removing the last admin
    IF (target_user_data->>'role') = 'admin' 
       AND new_role != 'admin' 
       AND admin_count <= 1 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Tidak dapat menghapus admin terakhir'
        );
    END IF;

    -- Begin the update transaction
    BEGIN
        -- Update auth.users metadata
        UPDATE auth.users
        SET raw_user_meta_data = 
            jsonb_set(
                COALESCE(raw_user_meta_data, '{}'::jsonb),
                '{role}',
                to_jsonb(new_role::text)
            )
        WHERE id = target_user_id;

        -- Also update the users table if it exists
        UPDATE users
        SET role = new_role
        WHERE id = target_user_id;

        RETURN json_build_object(
            'success', true,
            'message', 'Role berhasil diperbarui',
            'user', json_build_object(
                'id', target_user_id,
                'role', new_role
            )
        );
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Terjadi kesalahan: ' || SQLERRM
        );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;