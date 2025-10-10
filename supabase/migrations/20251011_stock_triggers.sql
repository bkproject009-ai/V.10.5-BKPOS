-- Create function to update total stock
CREATE OR REPLACE FUNCTION public.update_total_stock()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Update products table with the sum of storage stock and cashier stock
    UPDATE products 
    SET stock = (
        SELECT COALESCE(SUM(storage_stock), 0) 
        FROM product_storage 
        WHERE product_id = NEW.product_id
    ) + (
        SELECT COALESCE(SUM(stock), 0) 
        FROM cashier_stock 
        WHERE product_id = NEW.product_id
    )
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$function$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_stock_after_storage_change ON product_storage;
DROP TRIGGER IF EXISTS update_stock_after_cashier_change ON cashier_stock;

-- Create trigger for product_storage changes
CREATE TRIGGER update_stock_after_storage_change
    AFTER INSERT OR UPDATE OR DELETE ON product_storage
    FOR EACH ROW
    EXECUTE FUNCTION update_total_stock();

-- Create trigger for cashier_stock changes
CREATE TRIGGER update_stock_after_cashier_change
    AFTER INSERT OR UPDATE OR DELETE ON cashier_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_total_stock();