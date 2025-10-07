-- Create a test function to debug JWT
CREATE OR REPLACE FUNCTION debug_jwt()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'jwt_raw', current_setting('request.jwt.claims', true),
    'user_metadata', auth.jwt() -> 'user_metadata',
    'app_metadata', auth.jwt() -> 'app_metadata',
    'role', auth.jwt() ->> 'role',
    'user_role', (auth.jwt() -> 'user_metadata' ->> 'role'),
    'app_role', (auth.jwt() -> 'app_metadata' ->> 'role')
  )::jsonb;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION debug_jwt TO authenticated;