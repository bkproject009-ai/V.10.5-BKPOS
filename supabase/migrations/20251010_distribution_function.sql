-- Drop existing function if exists
DROP FUNCTION IF EXISTS distribute_stock_to_cashier(uuid, uuid, integer, uuid, text);
DROP FUNCTION IF EXISTS distribute_stock_to_cashier(text, text, integer, text, text);

-- Create function for distributing stock to cashier
CREATE OR REPLACE FUNCTION distribute_stock_to_cashier(
    IN _product_id uuid,
    IN _cashier_id uuid,
    IN _quantity integer,
    IN _distributed_by uuid,
    IN _notes text DEFAULT NULL,
    OUT response jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _current_warehouse_stock integer;
    _current_cashier_stock integer;
    _new_warehouse_stock integer;
    _new_cashier_stock integer;
BEGIN
    -- Get current warehouse stock
    SELECT quantity INTO _current_warehouse_stock
    FROM product_storage
    WHERE product_id = _product_id;

    -- Check if we have enough stock
    IF _current_warehouse_stock IS NULL OR _current_warehouse_stock < _quantity THEN
        response := jsonb_build_object(
            'success', false,
            'error', 'Stok di gudang tidak mencukupi',
            'warehouse_stock', COALESCE(_current_warehouse_stock, 0),
            'requested_quantity', _quantity
        );
        RETURN;
    END IF;

    -- Get current cashier stock
    SELECT quantity INTO _current_cashier_stock
    FROM cashier_stock
    WHERE product_id = _product_id AND cashier_id = _cashier_id;

    -- Begin transaction
    BEGIN
        -- Reduce warehouse stock
        UPDATE product_storage
        SET 
            quantity = quantity - _quantity,
            updated_at = NOW()
        WHERE product_id = _product_id
        RETURNING quantity INTO _new_warehouse_stock;

        -- Update or insert cashier stock
        IF _current_cashier_stock IS NULL THEN
            INSERT INTO cashier_stock (
                product_id,
                cashier_id,
                quantity,
                created_at,
                updated_at
            ) VALUES (
                _product_id,
                _cashier_id,
                _quantity,
                NOW(),
                NOW()
            )
            RETURNING quantity INTO _new_cashier_stock;
        ELSE
            UPDATE cashier_stock
            SET 
                quantity = quantity + _quantity,
                updated_at = NOW()
            WHERE product_id = _product_id AND cashier_id = _cashier_id
            RETURNING quantity INTO _new_cashier_stock;
        END IF;

        -- Record the distribution
        INSERT INTO stock_distributions (
            product_id,
            cashier_id,
            quantity,
            distributed_by,
            distributed_at,
            notes
        ) VALUES (
            _product_id,
            _cashier_id,
            _quantity,
            _distributed_by,
            NOW(),
            _notes
        );

        -- Return success response
        response := jsonb_build_object(
            'success', true,
            'previous_warehouse_stock', _current_warehouse_stock,
            'new_warehouse_stock', _new_warehouse_stock,
            'previous_cashier_stock', COALESCE(_current_cashier_stock, 0),
            'new_cashier_stock', _new_cashier_stock,
            'distributed_quantity', _quantity
        );
        RETURN;

    EXCEPTION WHEN OTHERS THEN
        -- Rollback will happen automatically
        response := jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'warehouse_stock', _current_warehouse_stock,
            'cashier_stock', COALESCE(_current_cashier_stock, 0)
        );
        RETURN;
    END;
END;
$$;