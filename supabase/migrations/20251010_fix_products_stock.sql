-- Add new columns to products table if they don't exist
DO $$ 
BEGIN 
  -- Add storage_stock column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'storage_stock') 
  THEN
    ALTER TABLE products ADD COLUMN storage_stock integer DEFAULT 0;
  END IF;

  -- Add total_stock column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'total_stock') 
  THEN
    ALTER TABLE products ADD COLUMN total_stock integer DEFAULT 0;
  END IF;

  -- Remove old warehouse_stock column if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'warehouse_stock') 
  THEN
    ALTER TABLE products DROP COLUMN warehouse_stock;
  END IF;
END $$;

-- Update existing products with correct stock values
WITH stock_totals AS (
  SELECT 
    p.id as product_id,
    COALESCE(ps.quantity, 0) as storage_stock,
    COALESCE(SUM(cs.quantity), 0) as cashier_stock_total
  FROM products p
  LEFT JOIN product_storage ps ON p.id = ps.product_id
  LEFT JOIN cashier_stock cs ON p.id = cs.product_id
  GROUP BY p.id, ps.quantity
)
UPDATE products p
SET 
  storage_stock = st.storage_stock,
  total_stock = st.storage_stock + st.cashier_stock_total
FROM stock_totals st
WHERE p.id = st.product_id;