-- Enable Row Level Security
alter table products enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table tax_types enable row level security;
alter table sales_taxes enable row level security;

-- Create policies for products table
create policy "Enable read access for all users"
on products for select
to anon
using (true);

create policy "Enable insert access for authenticated users"
on products for insert
to authenticated
with check (true);

create policy "Enable update access for authenticated users"
on products for update
to authenticated
using (true)
with check (true);

create policy "Enable delete access for authenticated users"
on products for delete
to authenticated
using (true);

-- Create policies for sales table
create policy "Enable read access for authenticated users"
on sales for select
to authenticated
using (true);

create policy "Enable insert access for authenticated users"
on sales for insert
to authenticated
with check (true);

-- Create policies for sale_items table
create policy "Enable read access for authenticated users"
on sale_items for select
to authenticated
using (true);

create policy "Enable insert access for authenticated users"
on sale_items for insert
to authenticated
with check (true);

-- Create policies for tax_types table
create policy "Enable read access for authenticated users"
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

-- Create policies for sales_taxes table
create policy "Enable read access for authenticated users"
on sales_taxes for select
to authenticated
using (true);

create policy "Enable insert access for authenticated users"
on sales_taxes for insert
to authenticated
with check (true);
