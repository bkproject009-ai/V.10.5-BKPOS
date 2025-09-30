-- Add or update tax tables
BEGIN;

-- Drop existing tables to avoid conflicts
DROP TABLE IF EXISTS sales_taxes CASCADE;
DROP TABLE IF EXISTS tax_types CASCADE;

-- Create tax_types table
CREATE TABLE tax_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    rate DECIMAL(5,2) NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sales_taxes table
CREATE TABLE sales_taxes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    tax_type_id UUID REFERENCES tax_types(id),
    tax_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tax_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_taxes ENABLE ROW LEVEL SECURITY;

-- Policies for tax_types
CREATE POLICY "Enable read for all users"
    ON tax_types FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable all for admin and manager"
    ON tax_types FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'manager')
        )
    );

-- Policies for sales_taxes
CREATE POLICY "Enable read for authenticated users"
    ON sales_taxes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for sales owner"
    ON sales_taxes FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sales
            WHERE sales.id = sale_id
            AND sales.cashier_id = auth.uid()
        )
    );

-- Add indices
CREATE INDEX idx_sales_taxes_sale ON sales_taxes(sale_id);
CREATE INDEX idx_sales_taxes_type ON sales_taxes(tax_type_id);

-- Add triggers for updated_at
CREATE TRIGGER update_tax_types_updated_at
    BEFORE UPDATE ON tax_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_taxes_updated_at
    BEFORE UPDATE ON sales_taxes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default tax type
INSERT INTO tax_types (name, rate, description, enabled)
VALUES ('PPN', 11.0, 'Pajak Pertambahan Nilai', true);

COMMIT;