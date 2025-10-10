-- Add storage_stock column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS storage_stock INT DEFAULT 0;

-- Create table for cashier-specific stock
CREATE TABLE IF NOT EXISTS cashier_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cashier_id UUID NOT NULL REFERENCES auth.users(id),
  product_id UUID NOT NULL REFERENCES products(id),
  stock INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cashier_id, product_id)
);

-- Create stock distribution history table
CREATE TABLE IF NOT EXISTS stock_distributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  cashier_id UUID NOT NULL REFERENCES auth.users(id),
  quantity INT NOT NULL,
  distributed_by UUID NOT NULL REFERENCES auth.users(id),
  distributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create function to update products storage_stock
CREATE OR REPLACE FUNCTION update_product_storage_stock(
  _product_id UUID,
  _quantity INT
)
RETURNS VOID AS $$
BEGIN
  UPDATE products 
  SET 
    storage_stock = GREATEST(0, storage_stock + _quantity),
    updated_at = NOW()
  WHERE id = _product_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to distribute stock from storage to cashier
CREATE OR REPLACE FUNCTION distribute_stock_to_cashier(
  _product_id UUID,
  _cashier_id UUID,
  _quantity INT,
  _distributed_by UUID
)
RETURNS VOID AS $$
DECLARE
  _available_stock INT;
BEGIN
  -- Get available storage stock
  SELECT storage_stock INTO _available_stock
  FROM products
  WHERE id = _product_id;

  -- Check if enough stock is available
  IF _available_stock < _quantity THEN
    RAISE EXCEPTION 'Insufficient stock in storage. Available: %, Requested: %', _available_stock, _quantity;
  END IF;

  -- Begin transaction
  BEGIN
    -- Decrease storage stock
    UPDATE products 
    SET 
      storage_stock = storage_stock - _quantity,
      updated_at = NOW()
    WHERE id = _product_id;

    -- Insert or update cashier stock
    INSERT INTO cashier_stock (cashier_id, product_id, stock)
    VALUES (_cashier_id, _product_id, _quantity)
    ON CONFLICT (cashier_id, product_id)
    DO UPDATE SET 
      stock = cashier_stock.stock + _quantity,
      updated_at = NOW();

    -- Record distribution
    INSERT INTO stock_distributions (
      product_id,
      cashier_id,
      quantity,
      distributed_by
    ) VALUES (
      _product_id,
      _cashier_id,
      _quantity,
      _distributed_by
    );

    -- Update total stock in products table
    UPDATE products 
    SET 
      stock = (
        SELECT COALESCE(SUM(stock), 0)
        FROM cashier_stock
        WHERE product_id = _product_id
      ) + storage_stock
    WHERE id = _product_id;
  END;
END;
$$ LANGUAGE plpgsql;