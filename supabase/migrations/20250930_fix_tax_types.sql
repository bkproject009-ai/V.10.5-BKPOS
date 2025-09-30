-- Drop existing table and policies if they exist
drop policy if exists "Enable read access for authenticated users" on tax_types;
drop policy if exists "Enable insert for authenticated users" on tax_types;
drop policy if exists "Enable update for authenticated users" on tax_types;
drop policy if exists "Enable delete for authenticated users" on tax_types;
drop trigger if exists update_tax_types_updated_at on tax_types;
drop function if exists update_updated_at_column();
drop table if exists tax_types;

-- Recreate the tax_types table
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

-- Create the updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create the trigger
create trigger update_tax_types_updated_at
    before update on tax_types
    for each row
    execute function update_updated_at_column();

-- Enable RLS
alter table tax_types enable row level security;

-- Create RLS policies
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

-- Insert default tax type
insert into tax_types (code, name, description, rate)
values ('PPN', 'Pajak Pertambahan Nilai', 'PPN Indonesia', 11.00);