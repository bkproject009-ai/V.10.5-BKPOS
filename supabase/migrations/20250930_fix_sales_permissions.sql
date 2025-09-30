-- Fix sales table policies and constraints
BEGIN;

-- First, fix the foreign key constraint
ALTER TABLE sales 
  DROP CONSTRAINT IF EXISTS sales_cashier_id_fkey;

-- Add the correct foreign key constraint that references auth.users
ALTER TABLE sales 
  ADD CONSTRAINT sales_cashier_id_fkey 
  FOREIGN KEY (cashier_id) 
  REFERENCES auth.users(id)
  ON DELETE SET NULL;  -- Allow NULL when user is deleted

-- Make sure all existing sales have valid cashier_ids
UPDATE sales 
SET cashier_id = NULL 
WHERE cashier_id NOT IN (SELECT id FROM auth.users);

-- Drop existing policies
DROP POLICY IF EXISTS "Enable access for authenticated users on sales" ON sales;
DROP POLICY IF EXISTS "Enable read access for authenticated users on sales" ON sales;
DROP POLICY IF EXISTS "Enable insert access for authenticated users on sales" ON sales;
DROP POLICY IF EXISTS "Enable update access for authenticated users on sales" ON sales;
DROP POLICY IF EXISTS "Enable access for authenticated users on sale_items" ON sale_items;
DROP POLICY IF EXISTS "Enable read access for authenticated users on sale_items" ON sale_items;
DROP POLICY IF EXISTS "Enable insert access for authenticated users on sale_items" ON sale_items;

-- Enable RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Create policies for sales
CREATE POLICY "Enable read access for own sales and managers"
    ON sales FOR SELECT
    TO authenticated
    USING (
        cashier_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND (raw_user_meta_data->>'role' IN ('admin', 'manager'))
        )
    );

CREATE POLICY "Enable insert for authenticated users"
    ON sales FOR INSERT
    TO authenticated
    WITH CHECK (
        cashier_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND (raw_user_meta_data->>'role' IN ('admin', 'manager'))
        )
    );

CREATE POLICY "Enable update for own sales and managers"
    ON sales FOR UPDATE
    TO authenticated
    USING (
        cashier_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND (raw_user_meta_data->>'role' IN ('admin', 'manager'))
        )
    )
    WITH CHECK (
        cashier_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND (raw_user_meta_data->>'role' IN ('admin', 'manager'))
        )
    );

-- Create policies for sale_items
CREATE POLICY "Enable read access for related sales"
    ON sale_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sales
            WHERE sales.id = sale_items.sale_id
            AND (
                sales.cashier_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM auth.users
                    WHERE id = auth.uid()
                    AND (raw_user_meta_data->>'role' IN ('admin', 'manager'))
                )
            )
        )
    );

CREATE POLICY "Enable insert for related sales"
    ON sale_items FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sales
            WHERE sales.id = sale_items.sale_id
            AND (
                sales.cashier_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM auth.users
                    WHERE id = auth.uid()
                    AND (raw_user_meta_data->>'role' IN ('admin', 'manager'))
                )
            )
        )
    );

-- Add indices for better performance
CREATE INDEX IF NOT EXISTS idx_sales_cashier_id ON sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- Add triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to sales table
DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to sale_items table
DROP TRIGGER IF EXISTS update_sale_items_updated_at ON sale_items;
CREATE TRIGGER update_sale_items_updated_at
    BEFORE UPDATE ON sale_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();