-- Check and fix cashier_stock table structure
do $$ 
begin
    -- Add stock column if it doesn't exist
    if not exists (
        select 1 
        from information_schema.columns 
        where table_name = 'cashier_stock' 
        and column_name = 'stock'
    ) then
        alter table cashier_stock 
        add column stock integer not null default 0;
    end if;

    -- Add created_at column if it doesn't exist
    if not exists (
        select 1 
        from information_schema.columns 
        where table_name = 'cashier_stock' 
        and column_name = 'created_at'
    ) then
        alter table cashier_stock 
        add column created_at timestamp with time zone default timezone('utc'::text, now()) not null;
    end if;

    -- Add updated_at column if it doesn't exist
    if not exists (
        select 1 
        from information_schema.columns 
        where table_name = 'cashier_stock' 
        and column_name = 'updated_at'
    ) then
        alter table cashier_stock 
        add column updated_at timestamp with time zone default timezone('utc'::text, now()) not null;
    end if;

    -- Ensure the unique constraint exists
    if not exists (
        select 1
        from pg_constraint
        where conname = 'cashier_stock_product_cashier_unique'
    ) then
        alter table cashier_stock
        add constraint cashier_stock_product_cashier_unique 
        unique (product_id, cashier_id);
    end if;
end $$;