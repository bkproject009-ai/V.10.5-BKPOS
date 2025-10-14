-- Insert test data into cashier_stock
insert into cashier_stock (product_id, cashier_id, stock)
select 
  p.id as product_id,
  '22cd12cb-6337-44f7-948d-40128426c3dc'::uuid as cashier_id, -- Ganti dengan ID kasir yang aktif
  50 as stock -- default stock untuk testing
from 
  products p 
where 
  not exists (
    select 1 
    from cashier_stock cs 
    where cs.product_id = p.id 
    and cs.cashier_id = '22cd12cb-6337-44f7-948d-40128426c3dc'::uuid
  );