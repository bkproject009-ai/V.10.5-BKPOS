-- Function to ensure user has role set
CREATE OR REPLACE FUNCTION public.ensure_user_role()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.raw_user_meta_data IS NULL OR NEW.raw_user_meta_data->>'role' IS NULL THEN
        NEW.raw_user_meta_data = COALESCE(NEW.raw_user_meta_data, '{}'::jsonb) || 
                                jsonb_build_object('role', 'user');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to ensure role is always set
DROP TRIGGER IF EXISTS ensure_user_role_trigger ON auth.users;
CREATE TRIGGER ensure_user_role_trigger
    BEFORE INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_user_role();

-- Set admin role for specific user
UPDATE auth.users 
SET raw_user_meta_data = 
    CASE 
        WHEN raw_user_meta_data IS NULL THEN 
            jsonb_build_object('role', 'admin')
        ELSE 
            jsonb_set(
                COALESCE(raw_user_meta_data, '{}'::jsonb),
                '{role}',
                '"admin"'
            )
    END
WHERE email = 'fadlannafian@gmail.com';