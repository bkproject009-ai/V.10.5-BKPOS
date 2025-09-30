-- Fix sales table structure and policies
BEGIN;

-- Add cashier_id to sales if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'sales' AND column_name = 'cashier_id') THEN
        ALTER TABLE sales ADD COLUMN cashier_id uuid REFERENCES auth.users(id);
    END IF;
END $$;

-- Make cashier_id nullable for existing records but required for new ones
ALTER TABLE sales ALTER COLUMN cashier_id DROP NOT NULL;
UPDATE sales SET cashier_id = (SELECT id FROM auth.users LIMIT 1) WHERE cashier_id IS NULL;
ALTER TABLE sales ALTER COLUMN cashier_id SET NOT NULL;

-- Update sales policies to include cashier_id check
DROP POLICY IF EXISTS "Enable all access for authenticated users on sales" ON sales;
CREATE POLICY "Enable all access for authenticated users on sales"
    ON sales FOR ALL
    TO authenticated
    USING (
        CASE 
            WHEN current_user_id() = cashier_id THEN true
            WHEN EXISTS (
                SELECT 1 FROM auth.users 
                WHERE id = auth.uid() 
                AND raw_user_meta_data->>'role' IN ('admin', 'manager')
            ) THEN true
            ELSE false
        END
    )
    WITH CHECK (
        CASE 
            WHEN current_user_id() = cashier_id THEN true
            WHEN EXISTS (
                SELECT 1 FROM auth.users 
                WHERE id = auth.uid() 
                AND raw_user_meta_data->>'role' IN ('admin', 'manager')
            ) THEN true
            ELSE false
        END
    );

-- Function to get current user id
CREATE OR REPLACE FUNCTION current_user_id() 
RETURNS uuid AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;