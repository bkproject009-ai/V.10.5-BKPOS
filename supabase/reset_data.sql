-- Disable triggers temporarily to avoid foreign key conflicts
SET session_replication_role = 'replica';

-- Clear sales related data first (child tables)
TRUNCATE TABLE sale_items CASCADE;
TRUNCATE TABLE sales_taxes CASCADE;
TRUNCATE TABLE sales CASCADE;

-- Clear user related data
TRUNCATE TABLE users CASCADE;

-- Clear stock related data
TRUNCATE TABLE cashier_stock CASCADE;

-- Clear product and tax related data

-- No need to reset sequences as tables use UUID

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Verify counts
SELECT 
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM products) as products_count,
    (SELECT COUNT(*) FROM sales) as sales_count,
    (SELECT COUNT(*) FROM sale_items) as sale_items_count,
    (SELECT COUNT(*) FROM sales_taxes) as sales_taxes_count,
    (SELECT COUNT(*) FROM cashier_stock) as cashier_stock_count;