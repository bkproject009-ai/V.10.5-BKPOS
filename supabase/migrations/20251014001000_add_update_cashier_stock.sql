-- Function untuk update stock kasir (penjualan atau penambahan)
create or replace function update_cashier_stock(
  p_product_id uuid,
  p_cashier_id uuid,
  p_quantity int
) returns void as $$
begin
  -- Validate stock for sales (negative quantities)
  if p_quantity < 0 then
    if not exists (
      select 1 from cashier_stocks 
      where product_id = p_product_id 
      and cashier_id = p_cashier_id
      and quantity >= abs(p_quantity)
    ) then
      raise exception 'Stok tidak mencukupi';
    end if;
  end if;

  -- Update/Insert cashier stock
  insert into cashier_stocks (
    product_id,
    cashier_id,
    quantity,
    updated_at
  ) values (
    p_product_id,
    p_cashier_id,
    p_quantity,
    now()
  )
  on conflict (product_id, cashier_id)
  do update set 
    quantity = cashier_stocks.quantity + p_quantity,
    updated_at = now();
end;
$$ language plpgsql;
