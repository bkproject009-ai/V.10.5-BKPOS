-- Function to update products table stock
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total stock from warehouse and cashier stocks
  WITH total_stocks AS (
    SELECT 
      p.id as product_id,
      COALESCE(ps.quantity, 0) as storage_stock,
      COALESCE(SUM(cs.quantity), 0) as total_cashier_stock
    FROM products p
    LEFT JOIN product_storage ps ON p.id = ps.product_id
    LEFT JOIN cashier_stock cs ON p.id = cs.product_id
    WHERE p.id = NEW.product_id
    GROUP BY p.id, ps.quantity
  )
  UPDATE products p
  SET 
    storage_stock = ts.storage_stock,
    total_stock = ts.storage_stock + ts.total_cashier_stock
  FROM total_stocks ts
  WHERE p.id = ts.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_product_stock_storage ON product_storage;
DROP TRIGGER IF EXISTS update_product_stock_cashier ON cashier_stock;

-- Create triggers for product_storage changes
CREATE TRIGGER update_product_stock_storage
  AFTER INSERT OR UPDATE OR DELETE ON product_storage
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock();

-- Create triggers for cashier_stock changes
CREATE TRIGGER update_product_stock_cashier
  AFTER INSERT OR UPDATE OR DELETE ON cashier_stock
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock();