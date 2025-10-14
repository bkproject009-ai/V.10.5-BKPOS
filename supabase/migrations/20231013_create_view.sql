-- Drop view if exists
drop view if exists cashier_products;

-- Create view for cashier products
create view cashier_products as
select 
    cs.id as cashier_stock_id,
    cs.product_id,
    cs.cashier_id,
    coalesce(cs.stock, 0) as stock,
    p.name as product_name,
    p.price,
    p.category,
    p.sku
from 
    products p
    left join cashier_stock cs on p.id = cs.product_id;

-- Enable RLS on the view
alter view cashier_products owner to authenticated;

-- Add RLS policy for the view
create policy "Cashier can see their own products"
    on cashier_products
    for select
    to authenticated
    using (
        auth.uid()::text = cashier_id::text 
        or 
        exists (
            select 1 
            from auth.users au 
            where au.id = auth.uid() 
            and (au.raw_user_meta_data->>'role')::text = 'admin'
        )
    );