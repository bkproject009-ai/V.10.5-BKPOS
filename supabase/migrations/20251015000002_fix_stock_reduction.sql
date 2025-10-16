-- Drop existing function if it exists
DROP FUNCTION IF EXISTS process_sale(JSONB[], TEXT, UUID);

-- Recreate the function with proper stock handling
CREATE OR REPLACE FUNCTION process_sale(
    _items JSONB[], -- Array of {product_id, quantity, price}
    _payment_method TEXT,
    _cashier_id UUID
)
RETURNS UUID AS $$
DECLARE
    _sale_id UUID;
    _subtotal NUMERIC(10,2) := 0;
    _tax_rate NUMERIC(5,2);
    _tax_amount NUMERIC(10,2);
    _total NUMERIC(10,2);
    _item JSONB;
    _product_id UUID;
    _quantity INTEGER;
    _price NUMERIC(10,2);
    _available_stock INTEGER;
    _product_name TEXT;
BEGIN
    -- Validate payment method
    IF _payment_method NOT IN ('cash', 'card', 'qris') THEN
        RAISE EXCEPTION 'Invalid payment method: %', _payment_method;
    END IF;

    -- Get PPN tax rate
    SELECT rate INTO _tax_rate 
    FROM tax_types 
    WHERE code = 'PPN' AND enabled = true;

    -- Begin transaction
    FOR _item IN SELECT * FROM jsonb_array_elements(_items)
    LOOP
        _product_id := (_item->>'product_id')::UUID;
        _quantity := (_item->>'quantity')::INTEGER;
        _price := (_item->>'price')::NUMERIC(10,2);

        -- Get product name for error messages
        SELECT name INTO _product_name 
        FROM products 
        WHERE id = _product_id;

        -- Check cashier stock availability
        SELECT stock INTO _available_stock 
        FROM cashier_stock 
        WHERE cashier_id = _cashier_id AND product_id = _product_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'No stock allocation found for product: % (%) for this cashier', 
                _product_name, _product_id;
        END IF;

        IF _available_stock < _quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product % (%). Available: %, Requested: %', 
                _product_name, _product_id, _available_stock, _quantity;
        END IF;

        -- Reduce cashier stock
        UPDATE cashier_stock 
        SET stock = stock - _quantity,
            updated_at = NOW()
        WHERE cashier_id = _cashier_id 
        AND product_id = _product_id;

        -- Update total stock in products table
        UPDATE products 
        SET total_stock = (
            SELECT COALESCE(SUM(stock), 0)
            FROM cashier_stock
            WHERE product_id = _product_id
        )
        WHERE id = _product_id;

        _subtotal := _subtotal + (_price * _quantity);
    END LOOP;

    -- Calculate tax and total
    _tax_amount := ROUND(_subtotal * _tax_rate / 100, 2);
    _total := _subtotal + _tax_amount;

    -- Create sale record
    INSERT INTO sales (
        subtotal,
        tax_amount,
        total,
        payment_method,
        cashier_id,
        status
    )
    VALUES (
        _subtotal,
        _tax_amount,
        _total,
        _payment_method,
        _cashier_id,
        'completed'
    )
    RETURNING id INTO _sale_id;

    -- Insert sale items
    FOR _item IN SELECT * FROM jsonb_array_elements(_items)
    LOOP
        INSERT INTO sale_items (
            sale_id,
            product_id,
            quantity,
            price_at_time
        )
        VALUES (
            _sale_id,
            (_item->>'product_id')::UUID,
            (_item->>'quantity')::INTEGER,
            (_item->>'price')::NUMERIC(10,2)
        );
    END LOOP;

    RETURN _sale_id;
END;
$$ LANGUAGE plpgsql;