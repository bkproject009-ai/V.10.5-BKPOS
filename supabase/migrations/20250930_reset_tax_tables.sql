-- First, clean up existing objects to avoid conflicts
drop policy if exists "Enable read access for authenticated users" on tax_types;
drop policy if exists "Enable insert for authenticated users" on tax_types;
drop policy if exists "Enable update for authenticated users" on tax_types;
drop policy if exists "Enable delete for authenticated users" on tax_types;
drop trigger if exists update_tax_types_updated_at on tax_types;

-- Drop triggers that depend on update_updated_at_column function
drop trigger if exists update_sales_updated_at on sales;
drop trigger if exists update_sale_items_updated_at on sale_items;

-- Now we can safely drop the function
drop function if exists update_updated_at_column() cascade;
drop table if exists sales_taxes;
drop table if exists tax_types;

-- Create updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create tax_types table
create table tax_types (
    id uuid default gen_random_uuid() primary key,
    code text not null unique,
    name text not null,
    description text,
    rate numeric(5,2) not null check (rate >= 0 and rate <= 100),
    enabled boolean not null default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create trigger for updated_at
create trigger update_tax_types_updated_at
    before update on tax_types
    for each row
    execute function update_updated_at_column();

-- Enable RLS
alter table tax_types enable row level security;

-- Create basic RLS policies
create policy "Enable read access for all users"
    on tax_types for select
    to authenticated
    using (true);

create policy "Enable insert for authenticated users"
    on tax_types for insert
    to authenticated
    with check (true);

create policy "Enable update for authenticated users"
    on tax_types for update
    to authenticated
    using (true)
    with check (true);

create policy "Enable delete for authenticated users"
    on tax_types for delete
    to authenticated
    using (true);

-- Insert default tax types
insert into tax_types (code, name, description, rate, enabled)
values 
    ('PPN', 'Pajak Pertambahan Nilai', 'PPN Indonesia', 11.00, true),
    ('PPH', 'Pajak Penghasilan', 'PPH 23 - Jasa', 2.00, false);

-- Create sales_taxes table
CREATE TABLE IF NOT EXISTS sales_taxes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    tax_type_id UUID NOT NULL REFERENCES tax_types(id),
    tax_rate DECIMAL(5,2) NOT NULL,
    tax_amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on sales_taxes
ALTER TABLE sales_taxes ENABLE ROW LEVEL SECURITY;

-- Create policies for sales_taxes
CREATE POLICY "Enable read access for authenticated users"
    ON sales_taxes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for authenticated users"
    ON sales_taxes FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
    ON sales_taxes FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_sales_taxes_updated_at
    BEFORE UPDATE ON sales_taxes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_taxes_sale_id ON sales_taxes(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_taxes_tax_type_id ON sales_taxes(tax_type_id);