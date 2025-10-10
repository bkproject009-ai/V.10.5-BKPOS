-- Create or replace function to sync storage stock to products table
CREATE OR REPLACE FUNCTION sync_product_storage_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the storage_stock in products table
    UPDATE products
    SET 
        storage_stock = COALESCE(NEW.quantity, 0),
        updated_at = NOW()
    WHERE id = NEW.product_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS sync_storage_stock_to_products ON product_storage;

-- Create trigger to sync storage stock
CREATE TRIGGER sync_storage_stock_to_products
    AFTER INSERT OR UPDATE ON product_storage
    FOR EACH ROW
    EXECUTE FUNCTION sync_product_storage_stock();