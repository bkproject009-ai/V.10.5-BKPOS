-- Reset complete database structure
BEGIN;

-- Drop existing tables
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales_taxes CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Create users table that mirrors auth.users
CREATE TABLE public.users (
    id UUID PRIMARY KEY,
    email TEXT,
    role TEXT DEFAULT 'cashier',
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sales table
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'qris')),
    cashier_id UUID NOT NULL,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT sales_cashier_id_fkey FOREIGN KEY (cashier_id) 
        REFERENCES public.users(id) ON DELETE CASCADE
);

-- Create sale_items table
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_time DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync existing auth users to public.users
INSERT INTO public.users (id, email, role)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'role', 'cashier')
FROM auth.users au
ON CONFLICT (id) DO UPDATE
SET 
    email = EXCLUDED.email,
    role = COALESCE(EXCLUDED.role, users.role);

-- Create trigger function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'cashier')
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        role = COALESCE(EXCLUDED.role, users.role);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Policies for users
CREATE POLICY "Enable read access for all authenticated users"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

-- Policies for sales
CREATE POLICY "Enable read access for all authenticated users"
    ON sales FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for self"
    ON sales FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = cashier_id);

-- Policies for sale_items
CREATE POLICY "Enable read access for all authenticated users"
    ON sale_items FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for sales owner"
    ON sale_items FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sales
            WHERE sales.id = sale_id
            AND sales.cashier_id = auth.uid()
        )
    );

-- Add indices
CREATE INDEX idx_sales_cashier ON sales(cashier_id);
CREATE INDEX idx_sales_date ON sales(created_at);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

COMMIT;