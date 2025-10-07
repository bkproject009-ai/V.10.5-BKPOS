-- Add cashier_id to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cashier_id UUID REFERENCES auth.users(id);

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_cashier_id ON sales(cashier_id);

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Cashiers can view their own sales" ON sales;

-- Add RLS policy for cashier access
CREATE POLICY "Cashiers can view their own sales"
  ON sales
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = cashier_id
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  );