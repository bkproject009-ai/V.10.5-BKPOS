-- BAGIAN 6: Create Payment System Tables and Updates
--------------------------------------------------------------------------------

-- Create QRIS payments table
CREATE TABLE IF NOT EXISTS qris_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id),
    external_id VARCHAR(100) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    qr_string TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    CONSTRAINT qris_status_check CHECK (status IN ('pending', 'success', 'failed'))
);

-- Add payment details columns to sales table
ALTER TABLE sales
    ADD COLUMN IF NOT EXISTS payment_details JSONB,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qris_payments_sale_id ON qris_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_qris_payments_status ON qris_payments(status);
CREATE INDEX IF NOT EXISTS idx_qris_payments_external_id ON qris_payments(external_id);

-- Create view for QRIS payment monitoring
CREATE OR REPLACE VIEW qris_payment_monitoring AS
SELECT
    qp.id AS payment_id,
    qp.sale_id,
    qp.external_id,
    qp.amount,
    qp.status,
    qp.created_at,
    qp.expires_at,
    qp.completed_at,
    s.cashier_id,
    s.total AS sale_total,
    (qp.expires_at < NOW()) AS is_expired
FROM qris_payments qp
JOIN sales s ON qp.sale_id = s.id
WHERE qp.status = 'pending'
AND qp.expires_at > NOW() - INTERVAL '1 day';  -- Show only last 24 hours

-- Update sales view to include payment details
CREATE OR REPLACE VIEW sales_with_payments AS
SELECT
    s.id AS sale_id,
    s.created_at,
    s.completed_at,
    s.subtotal,
    s.tax_amount,
    s.total,
    s.payment_method,
    s.status,
    s.cashier_id,
    s.payment_details,
    CASE 
        WHEN s.payment_method = 'qris' THEN qp.status
        ELSE NULL
    END AS qris_status,
    CASE 
        WHEN s.payment_method = 'qris' THEN qp.external_id
        ELSE NULL
    END AS qris_external_id
FROM sales s
LEFT JOIN qris_payments qp ON s.id = qp.sale_id
WHERE s.status IN ('pending', 'completed');