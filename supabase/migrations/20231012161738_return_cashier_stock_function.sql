-- Create new tables for stock management
create table if not exists cashier_stock (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id),
  cashier_id uuid references users(id),
  stock integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists stock_returns (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id),
  cashier_id uuid references users(id),
  user_id uuid references users(id),
  quantity integer not null,
  reason text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Function to return stock from cashier to warehouse
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
  select stock into _cashier_previous_stock
  from cashier_stock
  where product_id = _product_id and cashier_id = _cashier_id;

  if _cashier_previous_stock is null then
    raise exception 'No stock found for this product at cashier';
  end if;

  if _cashier_previous_stock < _quantity then
    raise exception 'Not enough stock at cashier to return';
  end if;

  -- Get current stock from warehouse
  select stock into _previous_stock
  from products
  where id = _product_id;

  -- Calculate new stocks
  _cashier_new_stock := _cashier_previous_stock - _quantity;
  _new_stock := _previous_stock + _quantity;

  -- Update cashier stock
  update cashier_stock
  set stock = _cashier_new_stock,
      updated_at = now()
  where product_id = _product_id and cashier_id = _cashier_id;

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
    'returned_quantity', _quantity
  );
end;
$$ language plpgsql security definer;