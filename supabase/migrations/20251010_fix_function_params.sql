-- Update storage management functions to fix parameter names
BEGIN;

-- Drop existing functions first
DROP FUNCTION IF EXISTS update_product_storage_stock(UUID, INTEGER);
DROP FUNCTION IF EXISTS distribute_stock_to_cashier(UUID, UUID, INTEGER);

-- Function to update product storage stock with fixed parameter names
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
    ON CONFLICT (product_id) DO UPDATE
    SET 
        storage_stock = EXCLUDED.storage_stock,
        updated_at = NOW();

    RETURN TRUE;
END;
$$;

-- Function to distribute stock to cashier with fixed parameter names
CREATE OR REPLACE FUNCTION distribute_stock_to_cashier(
    _product_id UUID,
    _cashier_id UUID,
    _quantity INTEGER,
    _distributed_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_storage_stock INTEGER;
    v_current_cashier_stock INTEGER;
BEGIN
    -- Check if user is cashier
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = _cashier_id 
        AND role = 'cashier'
    ) THEN
        RAISE EXCEPTION 'Invalid cashier ID';
    END IF;

    -- Get current storage stock
    SELECT storage_stock
    INTO v_storage_stock
    FROM product_storage
    WHERE product_id = _product_id;

    -- Check if enough stock in storage
    IF v_storage_stock IS NULL OR v_storage_stock < _quantity THEN
        RAISE EXCEPTION 'Insufficient storage stock. Available: %', COALESCE(v_storage_stock, 0);
    END IF;

    -- Get current cashier stock
    SELECT stock
    INTO v_current_cashier_stock
    FROM cashier_stock
    WHERE product_id = _product_id
    AND cashier_id = _cashier_id;

    -- Update storage stock
    UPDATE product_storage
    SET storage_stock = storage_stock - _quantity,
        updated_at = NOW()
    WHERE product_id = _product_id;

    -- Update cashier stock
    INSERT INTO cashier_stock (product_id, cashier_id, stock)
    VALUES (_product_id, _cashier_id, _quantity)
    ON CONFLICT (product_id, cashier_id) DO UPDATE
    SET 
        stock = cashier_stock.stock + EXCLUDED.stock,
        updated_at = NOW();

    -- Record the distribution
    INSERT INTO stock_distributions (
        product_id,
        cashier_id,
        quantity,
        distributed_by,
        distributed_at
    ) VALUES (
        _product_id,
        _cashier_id,
        _quantity,
        _distributed_by,
        NOW()
    );

    RETURN TRUE;
END;
$$;

COMMIT;