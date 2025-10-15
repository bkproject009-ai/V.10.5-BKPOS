-- Create return stock function
CREATE OR REPLACE FUNCTION return_stock(
  p_product_id UUID,
  p_cashier_id UUID,
  p_quantity INTEGER,
  p_reason TEXT,
  p_condition TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock INTEGER;
  v_cashier_stock JSONB;
BEGIN
  -- Get current product data
  SELECT cashier_stock, storage_stock 
  INTO v_cashier_stock, v_current_stock
  FROM products 
  WHERE id = p_product_id;

  -- Validate stock
  IF (v_cashier_stock->p_cashier_id)::INTEGER < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock';
  END IF;

  -- Begin transaction
  BEGIN
    -- Update cashier stock
    UPDATE products 
    SET 
      cashier_stock = jsonb_set(
        cashier_stock,
        ARRAY[p_cashier_id::TEXT],
        ((v_cashier_stock->p_cashier_id)::INTEGER - p_quantity)::TEXT::jsonb
      ),
      storage_stock = storage_stock + p_quantity,
      updated_at = NOW()
    WHERE id = p_product_id;

    -- Record return
    INSERT INTO stock_returns (
      product_id,
      cashier_id,
      quantity,
      reason,
      condition,
      created_by,
      created_at
    ) VALUES (
      p_product_id,
      p_cashier_id,
      p_quantity,
      p_reason,
      p_condition,
      auth.uid(),
      NOW()
    );

    -- Record stock history
    INSERT INTO stock_history (
      product_id,
      type,
      quantity,
      source_id,
      source_type,
      created_by,
      created_at
    ) VALUES (
      p_product_id,
      'return',
      p_quantity,
      p_cashier_id,
      'cashier',
      auth.uid(),
      NOW()
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$$;