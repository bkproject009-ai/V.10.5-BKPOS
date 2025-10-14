-- Function to distribute stock to cashier
create or replace function distribute_to_cashier(
  _product_id uuid,
  _cashier_id uuid,
  _quantity integer,
  _user_id uuid
) returns json as $$
declare
  _previous_stock integer;
  _new_stock integer;
  _cashier_previous_stock integer;
  _cashier_new_stock integer;
begin
  -- Get current warehouse stock
  select stock into _previous_stock
  from products
  where id = _product_id;

  if _previous_stock is null then
    raise exception 'Product not found';
  end if;

  if _previous_stock < _quantity then
    raise exception 'Not enough stock in warehouse. Available: %, Requested: %', _previous_stock, _quantity;
  end if;

  -- Get current cashier stock
  select coalesce(stock, 0) into _cashier_previous_stock
  from cashier_stock
  where product_id = _product_id and cashier_id = _cashier_id;

  if _cashier_previous_stock is null then
    _cashier_previous_stock := 0;
  end if;

  -- Calculate new stocks
  _new_stock := _previous_stock - _quantity;
  _cashier_new_stock := _cashier_previous_stock + _quantity;

  -- Update or insert cashier stock
  insert into cashier_stock (
    product_id, 
    cashier_id, 
    quantity,
    stock,
    created_at,
    updated_at
  ) values (
    _product_id,
    _cashier_id,
    _cashier_new_stock,
    _cashier_new_stock,
    now(),
    now()
  )
  on conflict (product_id, cashier_id) do update
  set 
    quantity = _cashier_new_stock,
    stock = _cashier_new_stock,
    updated_at = now();

  -- Update warehouse stock
  update products
  set stock = _new_stock
  where id = _product_id;

  return json_build_object(
    'success', true,
    'quantity', _quantity,
    'new_cashier_stock', _cashier_new_stock,
    'new_warehouse_stock', _new_stock,
    'previous_cashier_stock', _cashier_previous_stock,
    'previous_warehouse_stock', _previous_stock
  );

exception
  when others then
    return json_build_object(
      'success', false,
      'error', SQLERRM
    );
end;
$$ language plpgsql security definer;

-- Update return stock function to allow return to zero
create or replace function return_cashier_stock(
  _product_id uuid,
  _cashier_id uuid,
  _quantity integer,
  _reason text,
  _user_id uuid
) returns json as $$
declare
  _previous_stock integer;
  _new_stock integer;
  _cashier_previous_stock integer;
  _cashier_new_stock integer;
begin
  -- Get current stock from cashier
  select coalesce(stock, 0), coalesce(quantity, 0) into _cashier_previous_stock, _quantity
  from cashier_stock
  where product_id = _product_id and cashier_id = _cashier_id;

  if _cashier_previous_stock is null then
    _cashier_previous_stock := 0;
  end if;

  -- Use actual stock value from both stock and quantity columns
  _cashier_previous_stock := greatest(_cashier_previous_stock, _quantity);

  -- Handle return all (quantity = 0)
  if _quantity = 0 then
    _quantity := _cashier_previous_stock;
  end if;

  if _cashier_previous_stock < _quantity then
    raise exception 'Not enough stock at cashier. Available: %, Requested: %', _cashier_previous_stock, _quantity;
  end if;

  -- Get current stock from warehouse (main products table)
  select stock into _previous_stock
  from products
  where id = _product_id;

  if _previous_stock is null then
    raise exception 'Product not found';
  end if;

  -- Calculate new stocks
  _cashier_new_stock := _cashier_previous_stock - _quantity;
  _new_stock := _previous_stock + _quantity;

  -- Update or insert cashier stock
  insert into cashier_stock (
    product_id, 
    cashier_id, 
    quantity,
    stock,
    created_at,
    updated_at
  ) values (
    _product_id,
    _cashier_id,
    _cashier_new_stock,
    _cashier_new_stock,
    now(),
    now()
  )
  on conflict (product_id, cashier_id) do update
  set 
    quantity = _cashier_new_stock,
    stock = _cashier_new_stock,
    updated_at = now();

  -- Update warehouse stock
  update products
  set stock = _new_stock
  where id = _product_id;

  -- Record the return
  insert into stock_returns (
    product_id,
    cashier_id,
    user_id,
    quantity,
    reason
  ) values (
    _product_id,
    _cashier_id,
    _user_id,
    _quantity,
    _reason
  );

  return json_build_object(
    'success', true,
    'previous_stock', _previous_stock,
    'new_stock', _new_stock,
    'returned_quantity', _quantity,
    'cashier_previous_stock', _cashier_previous_stock,
    'cashier_new_stock', _cashier_new_stock
  );

exception
  when others then
    return json_build_object(
      'success', false,
      'error', SQLERRM
    );
end;
$$ language plpgsql security definer;