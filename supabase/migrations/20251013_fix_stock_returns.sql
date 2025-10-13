-- Drop old version of the function if exists
DROP FUNCTION IF EXISTS return_cashier_stock;

-- Create function to handle stock returns from cashier
CREATE OR REPLACE FUNCTION return_cashier_stock(
    _product_id UUID,
    _cashier_id UUID,
    _quantity INTEGER,
    _reason TEXT,
    _user_id UUID
) RETURNS JSON AS $$
DECLARE
    _current_stock INTEGER;
    _result JSON;
BEGIN
    -- Check if cashier has the stock
    SELECT quantity INTO _current_stock
    FROM cashier_stocks
    WHERE product_id = _product_id AND cashier_id = _cashier_id;

    IF _current_stock IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Tidak ada stok untuk produk ini',
            'current_stock', 0
        );
    END IF;

    -- Validate return quantity
    IF _quantity > _current_stock THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Jumlah pengembalian melebihi stok yang tersedia',
            'current_stock', _current_stock
        );
    END IF;

    -- Begin transaction
    BEGIN
        -- Record the return
        INSERT INTO stock_returns (
            product_id,
            cashier_id,
            quantity,
            reason,
            created_by
        ) VALUES (
            _product_id,
            _cashier_id,
            _quantity,
            _reason,
            _user_id
        );

        -- Update cashier stock
        IF _quantity = _current_stock THEN
            -- If returning all stock, remove the record
            DELETE FROM cashier_stocks
            WHERE product_id = _product_id AND cashier_id = _cashier_id;
        ELSE
            -- Otherwise reduce the stock
            UPDATE cashier_stocks
            SET quantity = quantity - _quantity
            WHERE product_id = _product_id AND cashier_id = _cashier_id;
        END IF;

        -- Update warehouse stock
        UPDATE product_storage
        SET quantity = quantity + _quantity
        WHERE product_id = _product_id;

        -- Return success
        RETURN json_build_object(
            'success', true,
            'previous_stock', _current_stock,
            'new_stock', _current_stock - _quantity,
            'returned_quantity', _quantity
        );

    EXCEPTION WHEN OTHERS THEN
        -- Return error
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;