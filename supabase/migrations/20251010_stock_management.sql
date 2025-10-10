-- Create stock adjustments table
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  adjusted_by UUID REFERENCES auth.users(id),
  adjusted_at TIMESTAMPTZ DEFAULT NOW(),
  location_type TEXT CHECK (location_type IN ('warehouse', 'cashier')),
  location_id UUID NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product ON stock_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_location ON stock_adjustments(location_type, location_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_date ON stock_adjustments(adjusted_at);

-- Function to adjust stock
CREATE OR REPLACE FUNCTION adjust_stock(
  _product_id UUID,
  _quantity INTEGER,
  _reason TEXT,
  _location_type TEXT,
  _location_id UUID,
  _adjusted_by UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert adjustment record
  INSERT INTO stock_adjustments (
    product_id,
    quantity_change,
    reason,
    adjusted_by,
    location_type,
    location_id
  ) VALUES (
    _product_id,
    _quantity,
    _reason,
    _adjusted_by,
    _location_type,
    _location_id
  );

  -- Update stock based on location type
  IF _location_type = 'warehouse' THEN
    UPDATE product_storage
    SET quantity = quantity + _quantity
    WHERE product_id = _product_id;
    
    -- Insert if not exists
    INSERT INTO product_storage (product_id, quantity)
    SELECT _product_id, _quantity
    WHERE NOT EXISTS (
      SELECT 1 FROM product_storage WHERE product_id = _product_id
    );
  ELSIF _location_type = 'cashier' THEN
    UPDATE cashier_stock
    SET quantity = quantity + _quantity
    WHERE product_id = _product_id AND cashier_id = _location_id;
    
    -- Insert if not exists
    INSERT INTO cashier_stock (product_id, cashier_id, quantity)
    SELECT _product_id, _location_id, _quantity
    WHERE NOT EXISTS (
      SELECT 1 FROM cashier_stock 
      WHERE product_id = _product_id AND cashier_id = _location_id
    );
  END IF;
END;
$$;

-- Function to get total product stock
CREATE OR REPLACE FUNCTION get_total_product_stock(_product_id UUID)
RETURNS TABLE (
  warehouse_stock INTEGER,
  total_cashier_stock INTEGER,
  total_stock INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _warehouse_stock INTEGER;
  _cashier_stock INTEGER;
BEGIN
  -- Get warehouse stock
  SELECT COALESCE(quantity, 0) INTO _warehouse_stock
  FROM product_storage
  WHERE product_id = _product_id;

  -- Get total cashier stock
  SELECT COALESCE(SUM(quantity), 0) INTO _cashier_stock
  FROM cashier_stock
  WHERE product_id = _product_id;

  RETURN QUERY
  SELECT 
    _warehouse_stock,
    _cashier_stock,
    _warehouse_stock + _cashier_stock;
END;
$$;

-- Function to get low stock alerts
CREATE OR REPLACE FUNCTION get_low_stock_alerts(stock_threshold INTEGER)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  current_stock INTEGER,
  location_type TEXT,
  location_id UUID,
  threshold INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- Check warehouse stock
  SELECT 
    p.id,
    p.name,
    COALESCE(ps.quantity, 0),
    'warehouse'::TEXT,
    ps.id,
    stock_threshold
  FROM products p
  LEFT JOIN product_storage ps ON p.id = ps.product_id
  WHERE COALESCE(ps.quantity, 0) <= stock_threshold
  
  UNION ALL
  
  -- Check cashier stock
  SELECT 
    p.id,
    p.name,
    cs.quantity,
    'cashier'::TEXT,
    cs.cashier_id,
    stock_threshold
  FROM products p
  JOIN cashier_stock cs ON p.id = cs.product_id
  WHERE cs.quantity <= stock_threshold;
END;
$$;

-- Enhanced stock distribution function
CREATE OR REPLACE FUNCTION distribute_stock_to_cashier(
  _product_id UUID,
  _cashier_id UUID,
  _quantity INTEGER,
  _distributed_by UUID,
  _notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_warehouse_stock INTEGER;
BEGIN
  -- Get current warehouse stock
  SELECT quantity INTO _current_warehouse_stock
  FROM product_storage
  WHERE product_id = _product_id;

  -- Validate stock availability
  IF _current_warehouse_stock IS NULL OR _current_warehouse_stock < _quantity THEN
    RAISE EXCEPTION 'Insufficient stock in warehouse';
  END IF;

  -- Begin transaction
  BEGIN
    -- Reduce warehouse stock
    UPDATE product_storage
    SET quantity = quantity - _quantity
    WHERE product_id = _product_id;

    -- Increase cashier stock
    UPDATE cashier_stock
    SET quantity = quantity + _quantity
    WHERE product_id = _product_id AND cashier_id = _cashier_id;
    
    -- Insert if not exists in cashier_stock
    INSERT INTO cashier_stock (product_id, cashier_id, quantity)
    SELECT _product_id, _cashier_id, _quantity
    WHERE NOT EXISTS (
      SELECT 1 FROM cashier_stock 
      WHERE product_id = _product_id AND cashier_id = _cashier_id
    );

    -- Record distribution
    INSERT INTO stock_distributions (
      product_id,
      cashier_id,
      quantity,
      distributed_by,
      notes
    ) VALUES (
      _product_id,
      _cashier_id,
      _quantity,
      _distributed_by,
      _notes
    );
  END;
END;
$$;

-- Update RLS policies
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all stock adjustments"
  ON stock_adjustments
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );

CREATE POLICY "Users can view their own stock adjustments"
  ON stock_adjustments
  FOR SELECT
  USING (
    auth.uid() = adjusted_by OR
    (location_type = 'cashier' AND location_id = auth.uid())
  );

CREATE POLICY "Admins can create stock adjustments"
  ON stock_adjustments
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );