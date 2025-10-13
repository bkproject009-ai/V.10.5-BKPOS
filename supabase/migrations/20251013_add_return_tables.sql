-- Create stock return table
CREATE TABLE IF NOT EXISTS stock_returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
    cashier_id UUID NOT NULL REFERENCES users(id),
    quantity INTEGER NOT NULL,
    reason TEXT,
    returned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    CONSTRAINT positive_return_quantity CHECK (quantity > 0)
);

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
    -- Check if cashier has enough stock
    SELECT quantity INTO _current_stock
    FROM cashier_stocks
    WHERE product_id = _product_id AND cashier_id = _cashier_id;

    IF _current_stock IS NULL OR _current_stock < _quantity THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Stok tidak mencukupi untuk pengembalian',
            'current_stock', COALESCE(_current_stock, 0)
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
        UPDATE cashier_stocks
        SET quantity = quantity - _quantity
        WHERE product_id = _product_id AND cashier_id = _cashier_id;

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

-- Add RLS policies
ALTER TABLE stock_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cashiers can view their own returns"
    ON stock_returns FOR SELECT
    USING (auth.uid() = cashier_id OR auth.uid() IN (
        SELECT id FROM users WHERE role = 'admin'
    ));

CREATE POLICY "Cashiers can create returns"
    ON stock_returns FOR INSERT
    WITH CHECK (auth.uid() = cashier_id OR auth.uid() IN (
        SELECT id FROM users WHERE role = 'admin'
    ));