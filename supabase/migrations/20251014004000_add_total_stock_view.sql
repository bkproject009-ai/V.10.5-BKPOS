create or replace view product_total_stocks as
select 
  p.id as product_id,
  p.storage_stock,
  coalesce(sum(cs.quantity), 0) as total_cashier_stock,
  coalesce(p.storage_stock, 0) + coalesce(sum(cs.quantity), 0) as total_stock
from products p
left join cashier_stocks cs on cs.product_id = p.id
group by p.id, p.storage_stock;

create or replace function get_product_stocks(p_product_id uuid)
returns jsonb as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'product_id', product_id,
    'storage_stock', storage_stock,
    'total_cashier_stock', total_cashier_stock,
    'total_stock', total_stock
  )
  into v_result
  from product_total_stocks
  where product_id = p_product_id;
  
  return v_result;
end;
$$ language plpgsql;
