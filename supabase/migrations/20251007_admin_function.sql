-- Function to set a user as admin
CREATE OR REPLACE FUNCTION public.set_user_admin(user_id UUID)
RETURNS void AS $$
BEGIN
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
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;