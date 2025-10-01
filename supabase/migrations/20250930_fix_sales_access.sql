-- Fix sales table access and relationships
BEGIN;

-- Enable RLS on all related tables if not already enabled
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable all access for authenticated users on sales" ON sales;
DROP POLICY IF EXISTS "Enable read access for authenticated users on sale_items" ON sale_items;
DROP POLICY IF EXISTS "Enable read access for authenticated users on sales_taxes" ON sales_taxes;

-- Create comprehensive policies for sales
CREATE POLICY "Enable read access for authenticated users on sales"
    ON sales FOR SELECT
    TO authenticated
    USING (
        -- Allow access if user is the cashier
        cashier_id = auth.uid()
        -- Or if user is admin/manager
        OR EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' IN ('admin', 'manager')
        )
    );

-- Create policies for sale_items
CREATE POLICY "Enable read access for authenticated users on sale_items"
    ON sale_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sales
            WHERE sales.id = sale_items.sale_id
            AND (
                sales.cashier_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM auth.users 
                    WHERE id = auth.uid() 
                    AND raw_user_meta_data->>'role' IN ('admin', 'manager')
                )
            )
        )
    );

-- Create policies for sales_taxes
CREATE POLICY "Enable read access for authenticated users on sales_taxes"
    ON sales_taxes FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sales
            WHERE sales.id = sales_taxes.sale_id
            AND (
                sales.cashier_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM auth.users 
                    WHERE id = auth.uid() 
                    AND raw_user_meta_data->>'role' IN ('admin', 'manager')
                )
            )
        )
    );

-- Create indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_cashier_id ON sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_taxes_sale_id ON sales_taxes(sale_id);

-- Verify and fix foreign key relationships
DO $$ 
BEGIN 
    -- Ensure sale_items references sales
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sale_items_sale_id_fkey'
    ) THEN
        ALTER TABLE sale_items 
        ADD CONSTRAINT sale_items_sale_id_fkey 
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE;
    END IF;

    -- Ensure sales_taxes references sales
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sales_taxes_sale_id_fkey'
    ) THEN
        ALTER TABLE sales_taxes 
        ADD CONSTRAINT sales_taxes_sale_id_fkey 
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE;
    END IF;
END $$;

COMMIT;