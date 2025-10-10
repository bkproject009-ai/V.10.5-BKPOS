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
