-- Migration untuk menghubungkan stock antara products, warehouse, dan cashier

-- Fungsi untuk memperbarui stok produk
CREATE OR REPLACE FUNCTION sync_product_stock() RETURNS VOID AS $$
DECLARE
    product_record RECORD;
BEGIN
    -- Untuk setiap produk
    FOR product_record IN SELECT id, stock FROM products LOOP
        -- Buat atau perbarui stok gudang
        INSERT INTO product_storage (product_id, quantity)
        VALUES (product_record.id, product_record.stock)
        ON CONFLICT (product_id) DO UPDATE
        SET quantity = product_record.stock;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Buat trigger untuk memperbarui stok produk saat stok gudang berubah
CREATE OR REPLACE FUNCTION update_product_stock() RETURNS TRIGGER AS $$
DECLARE
    total_stock INTEGER;
BEGIN
    -- Hitung total stok (gudang + kasir)
    SELECT 
        COALESCE(ps.quantity, 0) + COALESCE(SUM(cs.quantity), 0)
    INTO total_stock
    FROM product_storage ps
    LEFT JOIN cashier_stock cs ON cs.product_id = ps.product_id
    WHERE ps.product_id = NEW.product_id
    GROUP BY ps.quantity;

    -- Update stok di tabel products
    UPDATE products 
    SET stock = COALESCE(total_stock, 0)
    WHERE id = NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger jika sudah ada
DROP TRIGGER IF EXISTS update_product_stock_trigger ON product_storage;
DROP TRIGGER IF EXISTS update_product_stock_trigger_cashier ON cashier_stock;

-- Buat trigger untuk tabel product_storage
CREATE TRIGGER update_product_stock_trigger
    AFTER INSERT OR UPDATE OF quantity
    ON product_storage
    FOR EACH ROW
    EXECUTE FUNCTION update_product_stock();

-- Buat trigger untuk tabel cashier_stock
CREATE TRIGGER update_product_stock_trigger_cashier
    AFTER INSERT OR UPDATE OF quantity
    ON cashier_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_product_stock();

-- Sinkronkan stok yang ada
SELECT sync_product_stock();

-- Update fungsi adjust_warehouse_stock
CREATE OR REPLACE FUNCTION adjust_warehouse_stock(
    _product_id TEXT,
    _quantity INTEGER,
    _reason TEXT
)
RETURNS JSON AS $$
DECLARE
    _current_stock INTEGER;
    _new_stock INTEGER;
    _uuid_product_id UUID;
    _product_current_stock INTEGER;
BEGIN
    -- Convert text to UUID
    BEGIN
        _uuid_product_id := _product_id::UUID;
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid product ID format: ' || _product_id
        );
    END;

    -- Get current stock from products table
    SELECT stock INTO _product_current_stock
    FROM products
    WHERE id = _uuid_product_id;

    -- Get current warehouse stock or insert new record if doesn't exist
    INSERT INTO product_storage (product_id, quantity)
    VALUES (_uuid_product_id, COALESCE(_product_current_stock, 0))
    ON CONFLICT (product_id) DO UPDATE 
    SET quantity = COALESCE(product_storage.quantity, 0)
    RETURNING quantity INTO _current_stock;

    -- Calculate new stock
    _new_stock := COALESCE(_current_stock, 0) + _quantity;
    
    -- Check for negative stock before update
    IF _new_stock < 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', format('Stock tidak boleh negatif. Stok saat ini: %s, Pengurangan: %s', _current_stock, abs(_quantity))
        );
    END IF;

    -- Update warehouse stock
    UPDATE product_storage
    SET quantity = _new_stock
    WHERE product_id = _uuid_product_id;

    -- Record the adjustment
    INSERT INTO stock_adjustments (
        product_id,
        quantity_change,
        reason,
        adjusted_by,
        location_type
    ) VALUES (
        _uuid_product_id,
        _quantity,
        _reason,
        auth.uid(),
        'warehouse'
    );

    RETURN json_build_object(
        'success', true,
        'previous_stock', _current_stock,
        'new_stock', _new_stock,
        'change', _quantity,
        'product_id', _uuid_product_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', format('Error adjusting stock for product %s', _product_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;