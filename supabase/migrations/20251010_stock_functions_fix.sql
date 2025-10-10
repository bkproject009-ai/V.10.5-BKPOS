-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS adjust_warehouse_stock(uuid, integer, text);
DROP FUNCTION IF EXISTS distribute_stock_to_cashier(uuid, uuid, integer, uuid, text);

-- Create or replace the function to adjust warehouse stock
CREATE OR REPLACE FUNCTION public.adjust_warehouse_stock(
  IN _product_id uuid,
  IN _quantity integer,
  IN _reason text,
  OUT result jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  _current_stock integer;
  _new_stock integer;
BEGIN
  -- Start transaction
  BEGIN
    -- Get current stock
    SELECT COALESCE(quantity, 0) INTO _current_stock
    FROM product_storage
    WHERE product_id = _product_id;

    -- Calculate new stock
    _new_stock := _current_stock + _quantity;

    -- Check if new stock would be negative
    IF _new_stock < 0 THEN
      result := jsonb_build_object(
        'success', false,
        'error', 'Stok tidak boleh negatif',
        'current_stock', _current_stock,
        'requested_change', _quantity
      );
      RETURN;
    END IF;

    -- Insert or update the stock
    INSERT INTO product_storage (
      product_id,
      quantity,
      created_at,
      updated_at
    ) VALUES (
      _product_id,
      _new_stock,
      NOW(),
      NOW()
    )
    ON CONFLICT (product_id) DO UPDATE
    SET 
      quantity = _new_stock,
      updated_at = NOW();

    -- Insert the adjustment record
    INSERT INTO stock_adjustments (
      product_id,
      quantity_change,
      reason,
      location_type,
      location_id,
      adjusted_at
    ) VALUES (
      _product_id,
      _quantity,
      _reason,
      'warehouse',
      _product_id,
      NOW()
    );

    -- Return success response
    result := jsonb_build_object(
      'success', true,
      'previous_stock', _current_stock,
      'new_stock', _new_stock,
      'change', _quantity
    );

    -- Commit transaction
    RETURN;
  EXCEPTION WHEN OTHERS THEN
    -- Return error response
    result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', 'Terjadi kesalahan saat memperbarui stok'
    );
    RETURN;
  END;
END;
$function$;