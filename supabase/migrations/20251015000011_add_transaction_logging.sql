-- Add logging to complete_sale_transaction function
CREATE OR REPLACE FUNCTION log_sale_transaction(
    operation TEXT,
    details JSONB
) RETURNS void AS $$
BEGIN
    INSERT INTO transaction_logs (
        operation,
        details,
        created_at
    ) VALUES (
        operation,
        details,
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Create transaction logs table
CREATE TABLE IF NOT EXISTS transaction_logs (
    id SERIAL PRIMARY KEY,
    operation TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Modify complete_sale_transaction to include logging
CREATE OR REPLACE FUNCTION complete_sale_transaction(
    p_payment_method VARCHAR,
    p_status VARCHAR,
    p_total NUMERIC,
    p_subtotal NUMERIC,
    p_tax_amount NUMERIC,
    p_cashier_id UUID,
    p_payment_details JSONB,
    p_sale_items JSONB,
    p_sales_taxes JSONB
) RETURNS TABLE (
    id UUID,
    payment_method VARCHAR,
    status VARCHAR,
    total NUMERIC,
    created_at TIMESTAMPTZ
) LANGUAGE plpgsql AS $$
DECLARE
    v_sale_id UUID;
    v_item JSONB;
    v_tax JSONB;
    v_current_stock INTEGER;
    v_new_stock INTEGER;
BEGIN
    -- Log transaction start
    PERFORM log_sale_transaction('START', jsonb_build_object(
        'payment_method', p_payment_method,
        'total', p_total,
        'cashier_id', p_cashier_id
    ));

    -- Create sale record
    INSERT INTO sales (
        payment_method,
        status,
        total,
        subtotal,
        tax_amount,
        cashier_id,
        payment_details,
        completed_at
    ) VALUES (
        p_payment_method,
        p_status,
        p_total,
        p_subtotal,
        p_tax_amount,
        p_cashier_id,
        p_payment_details,
        CASE WHEN p_status = 'completed' THEN NOW() ELSE NULL END
    )
    RETURNING id INTO v_sale_id;

    -- Log sale creation
    PERFORM log_sale_transaction('SALE_CREATED', jsonb_build_object(
        'sale_id', v_sale_id,
        'total', p_total
    ));

    -- Process each sale item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_sale_items)
    LOOP
        -- Get current stock
        SELECT stock INTO v_current_stock
        FROM cashier_stock
        WHERE product_id = (v_item->>'product_id')::UUID
        AND cashier_id = p_cashier_id
        FOR UPDATE;

        -- Calculate new stock
        v_new_stock := COALESCE(v_current_stock, 0) - (v_item->>'quantity')::INTEGER;

        -- Log stock check
        PERFORM log_sale_transaction('STOCK_CHECK', jsonb_build_object(
            'product_id', v_item->>'product_id',
            'current_stock', v_current_stock,
            'quantity', v_item->>'quantity',
            'new_stock', v_new_stock
        ));

        -- Verify sufficient stock
        IF v_new_stock < 0 THEN
            RAISE EXCEPTION 'Insufficient stock for product %: have %, need %',
                v_item->>'product_id',
                v_current_stock,
                v_item->>'quantity';
        END IF;

        -- Update cashier stock
        INSERT INTO cashier_stock (cashier_id, product_id, stock)
        VALUES (
            p_cashier_id,
            (v_item->>'product_id')::UUID,
            v_new_stock
        )
        ON CONFLICT (cashier_id, product_id) DO UPDATE
        SET stock = v_new_stock,
            updated_at = NOW();

        -- Insert sale item
        INSERT INTO sale_items (
            sale_id,
            product_id,
            quantity,
            price_at_time
        ) VALUES (
            v_sale_id,
            (v_item->>'product_id')::UUID,
            (v_item->>'quantity')::INTEGER,
            (v_item->>'price_at_time')::NUMERIC
        );

        -- Log stock update
        PERFORM log_sale_transaction('STOCK_UPDATED', jsonb_build_object(
            'product_id', v_item->>'product_id',
            'new_stock', v_new_stock
        ));
    END LOOP;

    -- Insert sales taxes
    IF p_sales_taxes IS NOT NULL AND jsonb_array_length(p_sales_taxes) > 0 THEN
        FOR v_tax IN SELECT * FROM jsonb_array_elements(p_sales_taxes)
        LOOP
            INSERT INTO sales_taxes (
                sale_id,
                tax_id,
                amount
            ) VALUES (
                v_sale_id,
                (v_tax->>'tax_id')::UUID,
                (v_tax->>'amount')::NUMERIC
            );
        END LOOP;
    END IF;

    -- Log transaction completion
    PERFORM log_sale_transaction('COMPLETE', jsonb_build_object(
        'sale_id', v_sale_id,
        'status', 'success'
    ));

    RETURN QUERY
    SELECT 
        s.id,
        s.payment_method,
        s.status,
        s.total,
        s.created_at
    FROM sales s
    WHERE s.id = v_sale_id;

EXCEPTION WHEN OTHERS THEN
    -- Log error
    PERFORM log_sale_transaction('ERROR', jsonb_build_object(
        'error', SQLERRM,
        'detail', SQLSTATE
    ));
    RAISE;
END;
$$;