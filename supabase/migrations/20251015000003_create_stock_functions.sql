-- BAGIAN 3: Create Stock Management Functions
--------------------------------------------------------------------------------
-- Function to distribute stock to multiple cashiers
CREATE OR REPLACE FUNCTION distribute_stock_bulk(
    _product_id UUID,
    _distributions JSONB[], -- Array of {cashier_id, quantity}
    _distributed_by UUID
)
RETURNS VOID AS $$
DECLARE
    _total_quantity INTEGER := 0;
    _available_stock INTEGER;
    _dist JSONB;
    _product_name TEXT;
BEGIN
    -- Get product name for better error messages
    SELECT name INTO _product_name
    FROM products
    WHERE id = _product_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found: %', _product_id;
    END IF;

    -- Calculate total quantity needed
    FOREACH _dist IN ARRAY _distributions
    LOOP
        _total_quantity := _total_quantity + (_dist->>'quantity')::INTEGER;
    END LOOP;

    -- Check available storage stock
    SELECT storage_stock INTO _available_stock
    FROM products
    WHERE id = _product_id;

    IF _available_stock < _total_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for product % (%). Storage: %, Requested: %',
            _product_name, _product_id, _available_stock, _total_quantity;
    END IF;

    -- Process each distribution
    FOREACH _dist IN ARRAY _distributions
    LOOP
        -- Insert or update cashier stock
        INSERT INTO cashier_stock (
            cashier_id,
            product_id,
            stock
        )
        VALUES (
            (_dist->>'cashier_id')::UUID,
            _product_id,
            (_dist->>'quantity')::INTEGER
        )
        ON CONFLICT (cashier_id, product_id)
        DO UPDATE SET 
            stock = cashier_stock.stock + (_dist->>'quantity')::INTEGER,
            updated_at = NOW();

        -- Record distribution
        INSERT INTO stock_distributions (
            product_id,
            cashier_id,
            quantity,
            distributed_by
        )
        VALUES (
            _product_id,
            (_dist->>'cashier_id')::UUID,
            (_dist->>'quantity')::INTEGER,
            _distributed_by
        );
    END LOOP;

    -- Update storage stock
    UPDATE products 
    SET 
        storage_stock = storage_stock - _total_quantity,
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
END;
$$ LANGUAGE plpgsql;