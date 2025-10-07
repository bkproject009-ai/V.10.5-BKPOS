-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION update_user_role TO authenticated;

-- Create a policy that only allows admins to execute this function
CREATE POLICY "Only admins can update user roles"
    ON auth.users
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );