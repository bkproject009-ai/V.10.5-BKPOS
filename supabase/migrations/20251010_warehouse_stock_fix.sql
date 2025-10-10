-- Drop any existing functions
DROP FUNCTION IF EXISTS update_warehouse_stock(uuid, integer, text);
DROP FUNCTION IF EXISTS update_warehouse_stock(text, integer, text);
DROP FUNCTION IF EXISTS adjust_warehouse_stock(uuid, integer, text);
DROP FUNCTION IF EXISTS adjust_warehouse_stock(text, integer, text);

-- Create new function with a different name
CREATE OR REPLACE FUNCTION update_warehouse_stock(
    IN _product_id uuid,
    IN _quantity integer,
    IN _reason text,
    OUT response jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _current_stock integer;
    _new_stock integer;
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
        -- Calculate new stock
        _new_stock := _current_stock + _quantity;
        
        -- Check if new stock would be negative
        IF _new_stock < 0 THEN
            response := jsonb_build_object(
                'success', false,
                'error', 'Stok tidak boleh negatif',
                'current_stock', _current_stock,
                'requested_change', _quantity
            );
            RETURN;
        END IF;

        -- Update existing stock
        UPDATE product_storage
        SET 
            quantity = _new_stock,
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
        _product_id
    );

    -- Return success response
    response := jsonb_build_object(
        'success', true,
        'previous_stock', COALESCE(_current_stock, 0),
        'new_stock', _new_stock,
        'change', _quantity,
        'error', NULL::text
    );
    RETURN;

EXCEPTION WHEN OTHERS THEN
    response := jsonb_build_object(
        'success', false,
        'error', COALESCE(SQLERRM, 'Gagal memperbarui stok gudang'),
        'previous_stock', COALESCE(_current_stock, 0),
        'new_stock', COALESCE(_current_stock, 0),
        'change', 0,
        'updated_at', NOW()::text
    );
    RETURN;
END;
$$;