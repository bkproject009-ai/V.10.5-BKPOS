-- Step 1: Re-enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes ENABLE ROW LEVEL SECURITY;

-- Step 2: Create basic read policies
CREATE POLICY "Enable read for authenticated users"
ON users FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable read products"
ON products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable read tax_types"
ON tax_types FOR SELECT
TO authenticated
USING (true);

-- Step 3: Create role-based policies for admin
CREATE POLICY "Enable admin write products"
ON products FOR ALL
TO authenticated
USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Enable admin write tax_types"
ON tax_types FOR ALL
TO authenticated
USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Enable admin manage users"
ON users FOR ALL
TO authenticated
USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Step 4: Create cashier-specific policies
CREATE POLICY "Enable cashier sales"
ON sales FOR INSERT
TO authenticated
WITH CHECK (
    cashier_id = auth.uid()
);

CREATE POLICY "View own sales or admin view all"
ON sales FOR SELECT
TO authenticated
USING (
    cashier_id = auth.uid() OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Step 5: Create policies for related tables
CREATE POLICY "Enable sale items for own sales"
ON sale_items FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales 
        WHERE id = sale_items.sale_id 
        AND cashier_id = auth.uid()
    )
);

CREATE POLICY "View sale items for own sales or admin"
ON sale_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM sales 
        WHERE id = sale_items.sale_id 
        AND (
            cashier_id = auth.uid() OR 
            (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
        )
    )
);

CREATE POLICY "Enable sales taxes for own sales"
ON sales_taxes FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales 
        WHERE id = sales_taxes.sale_id 
        AND cashier_id = auth.uid()
    )
);

CREATE POLICY "View sales taxes for own sales or admin"
ON sales_taxes FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM sales 
        WHERE id = sales_taxes.sale_id 
        AND (
            cashier_id = auth.uid() OR 
            (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
        )
    )
);