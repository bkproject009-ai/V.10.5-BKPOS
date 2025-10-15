-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create SKU counter table
CREATE TABLE IF NOT EXISTS sku_counter (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_code VARCHAR(50) NOT NULL REFERENCES categories(code),
    last_number INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add category foreign key to products
ALTER TABLE products 
    DROP COLUMN IF EXISTS category,
    ADD COLUMN category_id UUID REFERENCES categories(id);

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
BEGIN
    -- Check available stock
    SELECT stock INTO _available_stock
    FROM cashier_stock
    WHERE product_id = _product_id AND cashier_id = _cashier_id;

    IF _available_stock < _quantity THEN
        RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', 
            _available_stock, _quantity;
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
BEGIN
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
        RAISE EXCEPTION 'Insufficient stock in storage. Available: %, Requested: %',
            _available_stock, _total_quantity;
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