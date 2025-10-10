-- Drop all versions of the function first
DROP FUNCTION IF EXISTS public.adjust_warehouse_stock(text, integer, text);
DROP FUNCTION IF EXISTS public.adjust_warehouse_stock(uuid, integer, text);

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS product_storage (
    product_id UUID PRIMARY KEY REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT positive_quantity CHECK (quantity >= 0)
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id),
    quantity_change INTEGER NOT NULL,
    reason TEXT NOT NULL,
    location_type TEXT CHECK (location_type IN ('warehouse', 'cashier')),
    location_id UUID NOT NULL,
    adjusted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the function with explicit type casting
CREATE OR REPLACE FUNCTION public.adjust_warehouse_stock(
    _product_id TEXT,
    _quantity INTEGER,
    _reason TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _current_stock INTEGER;
    _new_stock INTEGER;
    _uuid_product_id UUID;
BEGIN
    -- Convert text to UUID
    BEGIN
        _uuid_product_id := _product_id::UUID;
    EXCEPTION WHEN others THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid product ID format'
        );
    END;

    -- Get current stock
    SELECT quantity INTO _current_stock
    FROM product_storage
    WHERE product_id = _uuid_product_id;

    -- If product doesn't exist in storage, initialize it
    IF _current_stock IS NULL THEN
        INSERT INTO product_storage (product_id, quantity)
        VALUES (_uuid_product_id, _quantity)
        RETURNING quantity INTO _new_stock;
    ELSE
        -- Calculate new stock
        _new_stock := _current_stock + _quantity;
        
        -- Check if new stock would be negative
        IF _new_stock < 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Stok tidak boleh negatif',
                'current_stock', _current_stock,
                'requested_change', _quantity
            );
        END IF;

        -- Update existing stock
        UPDATE product_storage
        SET 
            quantity = _new_stock,
            updated_at = NOW()
        WHERE product_id = _uuid_product_id
        RETURNING quantity INTO _new_stock;
    END IF;

    -- Record the adjustment
    INSERT INTO stock_adjustments (
        product_id,
        quantity_change,
        reason,
        location_type,
        location_id,
        adjusted_at
    ) VALUES (
        _uuid_product_id,
        _quantity,
        _reason,
        'warehouse',
        _uuid_product_id,
        NOW()
    );

    -- Return the result
    RETURN jsonb_build_object(
        'success', true,
        'previous_stock', COALESCE(_current_stock, 0),
        'new_stock', _new_stock,
        'change', _quantity
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;