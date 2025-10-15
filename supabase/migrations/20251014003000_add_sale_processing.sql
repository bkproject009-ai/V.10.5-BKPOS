create or replace function process_sale(
  p_cashier_id uuid,
  p_items jsonb,
  p_payment_method text,
  p_subtotal numeric,
  p_tax_amount numeric,
  p_total numeric,
  p_taxes jsonb
) returns jsonb as $$
declare
  v_sale_id uuid;
  v_item jsonb;
  v_tax jsonb;
begin
  -- Insert sale record
  insert into sales (
    cashier_id,
    subtotal,
    tax_amount,
    total,
    payment_method,
    status,
    created_at
  ) values (
    p_cashier_id,
    p_subtotal,
    p_tax_amount,
    p_total,
    p_payment_method,
    'completed',
    now()
  ) returning id into v_sale_id;

  -- Process items and update stock
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    -- Insert sale item
    insert into sale_items (
      sale_id,
      product_id,
      quantity,
      price_at_time
    ) values (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::int,
      (v_item->>'price')::numeric
    );

    -- Update stock
    update cashier_stocks
    set 
      quantity = quantity - (v_item->>'quantity')::int,
      updated_at = now()
    where product_id = (v_item->>'product_id')::uuid
    and cashier_id = p_cashier_id;
  end loop;

  -- Process taxes
  for v_tax in select * from jsonb_array_elements(p_taxes)
  loop
    insert into sale_taxes (
      sale_id,
      tax_type_id,
      tax_amount
    ) values (
      v_sale_id,
      (v_tax->>'tax_type_id')::uuid,
      (v_tax->>'amount')::numeric
    );
  end loop;

  return jsonb_build_object(
    'success', true,
    'sale_id', v_sale_id
  );

exception when others then
  return jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
end;
$$ language plpgsql security definer;
