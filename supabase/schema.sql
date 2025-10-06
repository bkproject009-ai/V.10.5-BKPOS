create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  username varchar(255) unique,
  phone_number varchar(20),
  address text,
  full_name varchar(255),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price numeric(10,2) not null,
  stock integer not null,
  category text not null,
  sku text unique not null,
  description text,
  image text
);

create table if not exists sales (
  id uuid default gen_random_uuid() primary key,
  subtotal numeric(10,2) not null,
  tax_amount numeric(10,2) not null,
  total numeric(10,2) not null,
  payment_method text not null check (payment_method in ('cash', 'card', 'qris'))
);

-- Create sale_items table
create table sale_items (
  id uuid default gen_random_uuid() primary key,
  sale_id uuid references sales(id) on delete cascade,
  product_id uuid references products(id),
  quantity integer not null,
  price_at_time numeric(10,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create tax_types table
create table tax_types (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  name text not null,
  description text,
  rate numeric(5,2) not null,
  enabled boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create sales_taxes table to store multiple taxes per sale
create table sales_taxes (
  id uuid default gen_random_uuid() primary key,
  sale_id uuid references sales(id) on delete cascade,
  tax_type_id uuid references tax_types(id),
  tax_amount numeric(10,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Drop trigger if exists to avoid duplicate error
drop trigger if exists update_tax_types_updated_at on tax_types;
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_tax_types_updated_at
  before update on tax_types
  for each row
  execute function update_updated_at_column();

-- Pastikan kolom code ada sebelum insert
ALTER TABLE tax_types ADD COLUMN IF NOT EXISTS code text unique;
insert into tax_types (code, name, description, rate) 
values ('PPN', 'Pajak Pertambahan Nilai', 'PPN Indonesia', 11.00);