-- Function to adjust warehouse stock
CREATE OR REPLACE FUNCTION adjust_warehouse_stock(
  _product_id UUID,
  _quantity INTEGER,
  _reason TEXT
)
RETURNS VOID AS $$
DECLARE
  _current_stock INTEGER;
BEGIN
  -- Get current stock quantity or insert new record if doesn't exist
  INSERT INTO product_storage (product_id, stock_quantity)
  VALUES (_product_id, 0)
  ON CONFLICT (product_id) DO UPDATE 
  SET stock_quantity = product_storage.stock_quantity
  RETURNING stock_quantity INTO _current_stock;

  -- Update stock quantity
  UPDATE product_storage
  SET stock_quantity = stock_quantity + _quantity
  WHERE product_id = _product_id;

  -- Record the adjustment
  INSERT INTO stock_adjustments (
    product_id,
    quantity_change,
    reason,
    adjusted_by,
    location_type
  ) VALUES (
    _product_id,
    _quantity,
    _reason,
    auth.uid(),
    'warehouse'
  );

  -- Validate final stock is not negative
  IF (SELECT stock_quantity FROM product_storage WHERE product_id = _product_id) < 0 THEN
    RAISE EXCEPTION 'Stock tidak boleh negatif';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;