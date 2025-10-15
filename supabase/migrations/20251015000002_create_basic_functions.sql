-- BAGIAN 2: Create Functions
--------------------------------------------------------------------------------
-- Function to generate next SKU
CREATE OR REPLACE FUNCTION generate_sku(p_category_code VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    next_number INTEGER;
    new_sku VARCHAR;
BEGIN
    -- Get and increment counter
    WITH updated AS (
        INSERT INTO sku_counter (category_code, last_number)
        VALUES (p_category_code, 1)
        ON CONFLICT (category_code) DO UPDATE
        SET last_number = sku_counter.last_number + 1
        RETURNING last_number
    )
    SELECT last_number INTO next_number FROM updated;

    -- Format: CAT-0001
    new_sku := p_category_code || '-' || LPAD(next_number::TEXT, 4, '0');
    RETURN new_sku;
END;
$$ LANGUAGE plpgsql;

-- Function to process product return
CREATE OR REPLACE FUNCTION process_return(
    _product_id UUID,
    _cashier_id UUID,
    _quantity INTEGER,
    _reason TEXT,
    _created_by UUID
)
RETURNS UUID AS $$
DECLARE
    _return_id UUID;
    _available_stock INTEGER;
    _product_name TEXT;
BEGIN
    -- Get product name for better error messages
    SELECT name INTO _product_name
    FROM products
    WHERE id = _product_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found: %', _product_id;
    END IF;

    -- Check available stock
    SELECT stock INTO _available_stock
    FROM cashier_stock
    WHERE product_id = _product_id AND cashier_id = _cashier_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No stock allocation found for product: % (%)', 
            _product_name, _product_id;
    END IF;

    IF _available_stock < _quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product % (%). Available: %, Requested: %', 
            _product_name, _product_id, _available_stock, _quantity;
    END IF;

    -- Create return record
    INSERT INTO stock_returns (
        product_id,
        cashier_id,
        quantity,
        reason,
        created_by
    )
    VALUES (
        _product_id,
        _cashier_id,
        _quantity,
        _reason,
        _created_by
    )
    RETURNING id INTO _return_id;

    -- Update cashier stock
    UPDATE cashier_stock
    SET 
        stock = stock - _quantity,
        updated_at = NOW()
    WHERE 
        product_id = _product_id 
        AND cashier_id = _cashier_id;

    -- Update storage stock
    UPDATE products
    SET 
        storage_stock = storage_stock + _quantity,
        updated_at = NOW()
    WHERE id = _product_id;

    -- Update total stock
    UPDATE products 
    SET stock = (
        SELECT COALESCE(SUM(stock), 0)
        FROM cashier_stock
        WHERE product_id = _product_id
    ) + storage_stock
    WHERE id = _product_id;

    RETURN _return_id;
END;
$$ LANGUAGE plpgsql;