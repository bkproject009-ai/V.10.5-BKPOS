-- Function untuk return stock
create or replace function return_cashier_stock(
  p_product_id uuid,
  p_cashier_id uuid,
  p_quantity int,
  p_reason text
) returns void as $$
begin
  -- Validate stock
  if not exists (
    select 1 from cashier_stocks 
    where product_id = p_product_id 
    and cashier_id = p_cashier_id
    and quantity >= p_quantity
  ) then
    raise exception 'Stok tidak mencukupi';
  end if;

  -- Update cashier stock
  update cashier_stocks
  set quantity = quantity - p_quantity
  where product_id = p_product_id 
  and cashier_id = p_cashier_id;
  
  -- Update storage stock
  update products
  set storage_stock = storage_stock + p_quantity
  where id = p_product_id;
  
  -- Insert return history
  insert into stock_returns (
    product_id,
    cashier_id,
    quantity,
    reason,
    created_at
  ) values (
    p_product_id,
    p_cashier_id,
    p_quantity,
    p_reason,
    now()
  );
end;
$$ language plpgsql;

-- Function untuk distribusi stock
create or replace function distribute_stock_to_cashier(
  p_product_id uuid,
  p_cashier_id uuid,
  p_quantity int
) returns void as $$
begin
  -- Validate storage stock
  if not exists (
    select 1 from products
    where id = p_product_id
    and storage_stock >= p_quantity
  ) then
    raise exception 'Stok gudang tidak mencukupi';
  end if;

  -- Update storage stock
  update products
  set storage_stock = storage_stock - p_quantity
  where id = p_product_id;
  
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
    
  -- Insert distribution history
  insert into stock_distributions (
    product_id,
    cashier_id,
    quantity,
    created_at
  ) values (
    p_product_id,
    p_cashier_id,
    p_quantity,
    now()
  );
end;
$$ language plpgsql;

-- Function untuk update stock kasir (penjualan atau penambahan)
create or replace function update_cashier_stock(
  p_product_id uuid,
  p_cashier_id uuid,
  p_quantity int
) returns jsonb as $$
declare 
  v_previous_stock int;
  v_new_stock int;
begin
  -- Get previous stock
  select coalesce(quantity, 0) into v_previous_stock
  from cashier_stocks 
  where product_id = p_product_id 
  and cashier_id = p_cashier_id;

  -- Validate stock for sales (negative quantities)
  if p_quantity < 0 and (v_previous_stock + p_quantity) < 0 then
    raise exception 'Stok tidak mencukupi';
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
    coalesce(p_quantity, 0),
    now()
  )
  on conflict (product_id, cashier_id)
  do update set 
    quantity = GREATEST(0, cashier_stocks.quantity + p_quantity),
    updated_at = now()
  returning quantity into v_new_stock;
  
  -- Return status
  return jsonb_build_object(
    'success', true,
    'previous_stock', v_previous_stock,
    'new_stock', v_new_stock,
    'change', p_quantity
  );

exception when others then
  return jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'previous_stock', v_previous_stock,
    'new_stock', v_previous_stock,
    'change', 0
  );
end;
$$ language plpgsql;
