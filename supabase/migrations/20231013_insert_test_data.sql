-- Insert test data into cashier_stock
insert into cashier_stock (
  product_id, 
  cashier_id, 
  quantity,
  stock,
  created_at,
  updated_at
)
select 
  p.id as product_id,
  '22cd12cb-6337-44f7-948d-40128426c3dc'::uuid as cashier_id,
  50 as quantity,
  50 as stock,
  now() as created_at,
  now() as updated_at
from 
  products p 
where 
  not exists (
    select 1 
    from cashier_stock cs 
    where cs.product_id = p.id 
    and cs.cashier_id = '22cd12cb-6337-44f7-948d-40128426c3dc'::uuid
  );