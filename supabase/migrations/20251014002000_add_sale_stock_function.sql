-- Function untuk proses stok pada saat penjualan
create or replace function process_sale_stock(
  p_product_id uuid,
  p_cashier_id uuid,
  p_quantity int
) returns jsonb as $$
declare 
  v_current_stock int;
  v_new_stock int;
begin
  -- Get current stock with lock
  select quantity into v_current_stock
  from cashier_stocks 
  where product_id = p_product_id 
  and cashier_id = p_cashier_id
  for update;

  -- If no stock record exists, create one with 0 quantity
  if v_current_stock is null then
    insert into cashier_stocks (
      product_id,
      cashier_id,
      quantity,
      updated_at
    ) values (
      p_product_id,
      p_cashier_id,
      0,
      now()
    );
    v_current_stock := 0;
  end if;

  -- Check if we have enough stock
  if v_current_stock < p_quantity then
    return jsonb_build_object(
      'success', false,
      'error', 'Stok tidak mencukupi',
      'current_stock', v_current_stock,
      'requested_quantity', p_quantity
    );
  end if;

  -- Update stock
  update cashier_stocks
  set 
    quantity = quantity - p_quantity,
    updated_at = now()
  where product_id = p_product_id 
  and cashier_id = p_cashier_id
  returning quantity into v_new_stock;

  -- Return success response
  return jsonb_build_object(
    'success', true,
    'previous_stock', v_current_stock,
    'new_stock', v_new_stock,
    'change', p_quantity
  );

exception when others then
  return jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'current_stock', v_current_stock
  );
end;
$$ language plpgsql;
