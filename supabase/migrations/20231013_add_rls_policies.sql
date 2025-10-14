-- Drop existing policies if they exist
drop policy if exists "Allow read cashier_stock for authenticated users" on cashier_stock;
drop policy if exists "Allow update cashier_stock for authenticated users" on cashier_stock;
drop policy if exists "Allow insert cashier_stock for authenticated users" on cashier_stock;
drop policy if exists "Allow read stock_returns for authenticated users" on stock_returns;
drop policy if exists "Allow insert stock_returns for authenticated users" on stock_returns;

-- Enable RLS
alter table cashier_stock enable row level security;
alter table stock_returns enable row level security;

-- Policies for cashier_stock
create policy "Allow read cashier_stock for authenticated users"
  on cashier_stock for select
  to authenticated
  using (true);

create policy "Allow update cashier_stock for authenticated users"
  on cashier_stock for update
  to authenticated
  using (true);

create policy "Allow insert cashier_stock for authenticated users"
  on cashier_stock for insert
  to authenticated
  with check (true);

-- Policies for stock_returns
create policy "Allow read stock_returns for authenticated users"
  on stock_returns for select
  to authenticated
  using (true);

create policy "Allow insert stock_returns for authenticated users"
  on stock_returns for insert
  to authenticated
  with check (true);