-- SCRIPT MIGRASI BKPOS V.10.4
-- Jalankan script ini di Supabase SQL Editor

BEGIN;

-- Step 1: Create new tables
--------------------------------------------------------------------------------
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

-- Step 2: Add default categories
--------------------------------------------------------------------------------
INSERT INTO categories (code, name, description) 
VALUES 
    ('GEN', 'General', 'Produk Umum'),
    ('FNB', 'Food & Beverage', 'Makanan dan Minuman'),
    ('ELC', 'Electronics', 'Elektronik'),
    ('FSH', 'Fashion', 'Pakaian dan Aksesoris'),
    ('HCS', 'Health & Cosmetics', 'Kesehatan dan Kosmetik')
ON CONFLICT (code) DO UPDATE 
SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Step 3: Alter existing tables
--------------------------------------------------------------------------------
-- Backup existing category data
CREATE TEMP TABLE product_categories AS
SELECT id, category FROM products WHERE category IS NOT NULL;

-- Add category foreign key to products
ALTER TABLE products 
    DROP COLUMN IF EXISTS category,
    ADD COLUMN category_id UUID REFERENCES categories(id);

-- Map old categories to new ones (default to 'GEN' if no match)
UPDATE products p
SET category_id = c.id
FROM categories c, product_categories pc
WHERE p.id = pc.id
AND (
    CASE 
        WHEN pc.category ILIKE '%makanan%' OR pc.category ILIKE '%minuman%' THEN c.code = 'FNB'
        WHEN pc.category ILIKE '%elektronik%' THEN c.code = 'ELC'
        WHEN pc.category ILIKE '%pakaian%' OR pc.category ILIKE '%fashion%' THEN c.code = 'FSH'
        WHEN pc.category ILIKE '%kesehatan%' OR pc.category ILIKE '%kosmetik%' THEN c.code = 'HCS'
        ELSE c.code = 'GEN'
    END
);

-- Step 4: Create or replace functions
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
BEGIN
    -- Check available stock
    SELECT stock INTO _available_stock
    FROM cashier_stock
    WHERE product_id = _product_id AND cashier_id = _cashier_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No stock allocation found for this cashier';
    END IF;

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

-- Function to process sale with improved error handling
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

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PPN tax type not found or not enabled';
    END IF;

    -- Calculate subtotal and validate stock for all items
    FOREACH _item IN ARRAY _items
    LOOP
        _product_id := (_item->>'product_id')::UUID;
        _quantity := (_item->>'quantity')::INTEGER;
        _price := (_item->>'price')::NUMERIC(10,2);

        -- Get product name for better error messages
        SELECT name INTO _product_name
        FROM products
        WHERE id = _product_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product not found: %', _product_id;
        END IF;

        -- Check available stock for cashier
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

        _subtotal := _subtotal + (_price * _quantity);
    END LOOP;

    -- Calculate tax and total
    _tax_amount := ROUND(_subtotal * _tax_rate / 100, 2);
    _total := _subtotal + _tax_amount;

    -- Begin transaction
    BEGIN
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

        -- Insert sale items and update stock
        FOREACH _item IN ARRAY _items
        LOOP
            _product_id := (_item->>'product_id')::UUID;
            _quantity := (_item->>'quantity')::INTEGER;
            _price := (_item->>'price')::NUMERIC(10,2);

            -- Insert sale item
            INSERT INTO sale_items (
                sale_id,
                product_id,
                quantity,
                price_at_time
            )
            VALUES (
                _sale_id,
                _product_id,
                _quantity,
                _price
            );

            -- Update cashier stock
            UPDATE cashier_stock
            SET 
                stock = stock - _quantity,
                updated_at = NOW()
            WHERE 
                cashier_id = _cashier_id 
                AND product_id = _product_id;

            -- Update total stock in products
            UPDATE products
            SET
                stock = (
                    SELECT COALESCE(SUM(stock), 0)
                    FROM cashier_stock
                    WHERE product_id = _product_id
                ) + storage_stock,
                updated_at = NOW()
            WHERE id = _product_id;
        END LOOP;

        -- Insert tax record
        INSERT INTO sales_taxes (
            sale_id,
            tax_type_id,
            tax_amount
        )
        SELECT 
            _sale_id,
            id,
            _tax_amount
        FROM tax_types 
        WHERE code = 'PPN' AND enabled = true;

        RETURN _sale_id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Error processing sale: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create triggers for updated_at
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sku_counter_updated_at
    BEFORE UPDATE ON sku_counter
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;