-- Update storage management functions to fix all stock-related operations
BEGIN;

-- Function to update product storage stock
CREATE OR REPLACE FUNCTION update_product_storage_stock(
    _product_id UUID,
    _quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock INTEGER;
    v_new_stock INTEGER;
BEGIN
    -- Get current storage stock
    SELECT COALESCE(storage_stock, 0)
    INTO v_current_stock
    FROM product_storage
    WHERE product_id = _product_id;

    -- If no record exists, initialize with 0
    IF v_current_stock IS NULL THEN
        v_current_stock := 0;
    END IF;

    -- Calculate new stock
    v_new_stock := v_current_stock + _quantity;

    -- Prevent negative stock
    IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Stok tidak mencukupi. Sisa stok: %', v_current_stock;
    END IF;

    -- Insert or update storage stock
    INSERT INTO product_storage (product_id, storage_stock)
    VALUES (_product_id, v_new_stock)
    ON CONFLICT (product_id) 
    DO UPDATE SET storage_stock = EXCLUDED.storage_stock;

    -- Return success
    RETURN TRUE;
END;
$$;

-- Function to distribute stock to cashier
CREATE OR REPLACE FUNCTION distribute_stock_to_cashier(
    _product_id UUID,
    _cashier_id UUID,
    _quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_storage_stock INTEGER;
    v_current_cashier_stock INTEGER;
    v_new_cashier_stock INTEGER;
BEGIN
    -- Check if enough stock in storage
    SELECT storage_stock
    INTO v_storage_stock
    FROM product_storage
    WHERE product_id = _product_id;

    IF v_storage_stock IS NULL OR v_storage_stock < _quantity THEN
        RAISE EXCEPTION 'Stok di gudang tidak mencukupi. Sisa stok: %', COALESCE(v_storage_stock, 0);
    END IF;

    -- Get current cashier stock
    SELECT stock
    INTO v_current_cashier_stock
    FROM cashier_stock
    WHERE product_id = _product_id AND cashier_id = _cashier_id;

    -- If no record exists, initialize with 0
    IF v_current_cashier_stock IS NULL THEN
        v_current_cashier_stock := 0;
    END IF;

    -- Calculate new stock values
    v_new_cashier_stock := v_current_cashier_stock + _quantity;

    -- Update storage stock (reduce by distributed amount)
    UPDATE product_storage
    SET storage_stock = storage_stock - _quantity
    WHERE product_id = _product_id;

    -- Insert or update cashier stock
    INSERT INTO cashier_stock (product_id, cashier_id, stock)
    VALUES (_product_id, _cashier_id, v_new_cashier_stock)
    ON CONFLICT (product_id, cashier_id) 
    DO UPDATE SET stock = EXCLUDED.stock;

    -- Record the distribution in history
    INSERT INTO stock_distributions (
        product_id,
        cashier_id,
        quantity,
        distribution_date
    ) VALUES (
        _product_id,
        _cashier_id,
        _quantity,
        NOW()
    );

    -- Return success
    RETURN TRUE;
END;
$$;

COMMIT;