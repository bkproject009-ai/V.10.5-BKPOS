-- BAGIAN 5: Create Sales Tax Views
--------------------------------------------------------------------------------
-- View for sales with tax details
CREATE OR REPLACE VIEW sales_with_taxes AS
SELECT 
    s.id AS sale_id,
    s.created_at,
    s.subtotal,
    s.tax_amount,
    s.total,
    s.payment_method,
    s.status,
    s.cashier_id,
    jsonb_agg(
        jsonb_build_object(
            'tax_type_id', st.tax_type_id,
            'tax_code', tt.code,
            'tax_name', tt.name,
            'tax_rate', tt.rate,
            'tax_amount', st.tax_amount
        )
    ) AS taxes,
    jsonb_agg(
        jsonb_build_object(
            'product_id', si.product_id,
            'product_name', p.name,
            'quantity', si.quantity,
            'price_at_time', si.price_at_time,
            'subtotal', (si.quantity * si.price_at_time)
        )
    ) AS items
FROM sales s
LEFT JOIN sales_taxes st ON s.id = st.sale_id
LEFT JOIN tax_types tt ON st.tax_type_id = tt.id
LEFT JOIN sale_items si ON s.id = si.sale_id
LEFT JOIN products p ON si.product_id = p.id
GROUP BY s.id, s.created_at, s.subtotal, s.tax_amount, s.total, 
         s.payment_method, s.status, s.cashier_id;

-- View for daily sales summary with tax breakdown
CREATE OR REPLACE VIEW daily_sales_summary AS
WITH payment_method_counts AS (
    SELECT 
        DATE(created_at) AS sale_date,
        payment_method,
        COUNT(*) as method_count
    FROM sales
    WHERE status = 'completed'
    GROUP BY DATE(created_at), payment_method
),
daily_totals AS (
    SELECT 
        DATE(created_at) AS sale_date,
        COUNT(*) AS total_transactions,
        SUM(subtotal) AS total_subtotal,
        SUM(tax_amount) AS total_tax,
        SUM(total) AS total_amount
    FROM sales
    WHERE status = 'completed'
    GROUP BY DATE(created_at)
),
daily_tax_totals AS (
    SELECT 
        DATE(s.created_at) AS sale_date,
        tt.code AS tax_code,
        tt.name AS tax_name,
        SUM(st.tax_amount) AS tax_amount
    FROM sales s
    JOIN sales_taxes st ON s.id = st.sale_id
    JOIN tax_types tt ON st.tax_type_id = tt.id
    WHERE s.status = 'completed'
    GROUP BY DATE(s.created_at), tt.code, tt.name
)
SELECT 
    dt.sale_date,
    dt.total_transactions,
    dt.total_subtotal,
    dt.total_tax,
    dt.total_amount,
    jsonb_object_agg(
        COALESCE(pmc.payment_method, 'unknown'),
        COALESCE(pmc.method_count, 0)
    ) AS payment_methods_count,
    jsonb_agg(
        jsonb_build_object(
            'tax_code', dtt.tax_code,
            'tax_name', dtt.tax_name,
            'tax_amount', dtt.tax_amount
        )
    ) AS tax_breakdown
FROM daily_totals dt
LEFT JOIN payment_method_counts pmc ON dt.sale_date = pmc.sale_date
LEFT JOIN daily_tax_totals dtt ON dt.sale_date = dtt.sale_date
GROUP BY dt.sale_date, dt.total_transactions, dt.total_subtotal,
         dt.total_tax, dt.total_amount
ORDER BY dt.sale_date DESC;