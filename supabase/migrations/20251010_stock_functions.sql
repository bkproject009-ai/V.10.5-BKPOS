-- Create or replace the function to adjust warehouse stock
CREATE OR REPLACE FUNCTION adjust_warehouse_stock(
  _product_id UUID,
  _quantity INTEGER,
  _reason TEXT
) RETURNS jsonb AS $$
DECLARE
  _current_stock INTEGER;
  _new_stock INTEGER;
BEGIN
  -- Get current stock
  SELECT quantity INTO _current_stock
  FROM product_storage
  WHERE product_id = _product_id;

  -- If product doesn't exist in storage, initialize it
  IF _current_stock IS NULL THEN
    INSERT INTO product_storage (product_id, quantity)
    VALUES (_product_id, _quantity)
    RETURNING quantity INTO _new_stock;
  ELSE
    -- Update existing stock
    UPDATE product_storage
    SET 
      quantity = quantity + _quantity,
      updated_at = NOW()
    WHERE product_id = _product_id
    RETURNING quantity INTO _new_stock;
  END IF;

  -- Record the adjustment
  INSERT INTO stock_adjustments (
    product_id,
    quantity_change,
    reason,
    location_type,
    location_id
  ) VALUES (
    _product_id,
    _quantity,
    _reason,
    'warehouse',
    (SELECT id FROM product_storage WHERE product_id = _product_id)
  );

  -- Return the result
  RETURN jsonb_build_object(
    'success', true,
    'previous_stock', COALESCE(_current_stock, 0),
    'new_stock', _new_stock,
    'change', _quantity
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to distribute stock to cashier
CREATE OR REPLACE FUNCTION distribute_stock_to_cashier(
  _product_id UUID,
  _cashier_id UUID,
  _quantity INTEGER,
  _distributed_by UUID,
  _notes TEXT DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  _storage_stock INTEGER;
  _current_cashier_stock INTEGER;
  _distribution_id UUID;
BEGIN
  -- Check storage stock
  SELECT quantity INTO _storage_stock
  FROM product_storage
  WHERE product_id = _product_id;

  IF _storage_stock IS NULL OR _storage_stock < _quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Stok di gudang tidak mencukupi'
    );
  END IF;

  -- Begin transaction
  BEGIN
    -- Reduce storage stock
    UPDATE product_storage
    SET 
      quantity = quantity - _quantity,
      updated_at = NOW()
    WHERE product_id = _product_id;

    -- Update or insert cashier stock
    INSERT INTO cashier_stock (
      cashier_id,
      product_id,
      quantity
    ) VALUES (
      _cashier_id,
      _product_id,
      _quantity
    )
    ON CONFLICT (cashier_id, product_id) DO UPDATE
    SET 
      quantity = cashier_stock.quantity + _quantity,
      updated_at = NOW()
    RETURNING quantity INTO _current_cashier_stock;

    -- Record distribution
    INSERT INTO stock_distribution (
      product_id,
      quantity,
      cashier_id,
      distributed_by,
      notes
    ) VALUES (
      _product_id,
      _quantity,
      _cashier_id,
      _distributed_by,
      _notes
    )
    RETURNING id INTO _distribution_id;

    RETURN jsonb_build_object(
      'success', true,
      'storage_stock', _storage_stock - _quantity,
      'cashier_stock', _current_cashier_stock,
      'distribution_id', _distribution_id
    );
  EXCEPTION WHEN OTHERS THEN
    -- Rollback happens automatically
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;