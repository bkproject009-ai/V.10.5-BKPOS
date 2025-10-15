-- Function to update cashier stock (add or subtract)
CREATE OR REPLACE FUNCTION update_cashier_stock(
    p_product_id UUID,
    p_cashier_id UUID,
    p_quantity INTEGER -- Can be positive (add) or negative (subtract)
)
RETURNS INTEGER AS $$
DECLARE
    v_current_stock INTEGER;
    v_new_stock INTEGER;
BEGIN
    -- Get current stock
    SELECT stock INTO v_current_stock
    FROM cashier_stock
    WHERE product_id = p_product_id AND cashier_id = p_cashier_id;

    -- If no stock record exists, create one with 0 stock
    IF v_current_stock IS NULL THEN
        INSERT INTO cashier_stock (cashier_id, product_id, stock)
        VALUES (p_cashier_id, p_product_id, 0)
        RETURNING stock INTO v_current_stock;
    END IF;

    -- Calculate new stock
    v_new_stock := v_current_stock + p_quantity;

    -- Check if we have enough stock when reducing
    IF p_quantity < 0 AND v_new_stock < 0 THEN
        RAISE EXCEPTION 'Insufficient stock. Current: %, Requested: %', 
            v_current_stock, ABS(p_quantity);
    END IF;

    -- Update stock
    UPDATE cashier_stock 
    SET 
        stock = v_new_stock,
        updated_at = NOW()
    WHERE product_id = p_product_id AND cashier_id = p_cashier_id;

    -- Update product total stock
    UPDATE products 
    SET 
        stock = (
            SELECT COALESCE(SUM(stock), 0)
            FROM cashier_stock
            WHERE product_id = p_product_id
        ) + storage_stock,
        updated_at = NOW()
    WHERE id = p_product_id;

    RETURN v_new_stock;
END;
$$ LANGUAGE plpgsql;