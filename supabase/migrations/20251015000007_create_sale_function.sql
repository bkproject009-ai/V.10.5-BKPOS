-- Create function for handling sales transaction
CREATE OR REPLACE FUNCTION create_sale(
    p_payment_method VARCHAR,
    p_status VARCHAR,
    p_total NUMERIC,
    p_subtotal NUMERIC,
    p_tax_amount NUMERIC,
    p_cashier_id UUID,
    p_payment_details JSONB,
    p_completed_at TIMESTAMPTZ,
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
BEGIN
    -- Insert sale
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
        p_completed_at
    )
    RETURNING id INTO v_sale_id;

    -- Insert sale items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_sale_items)
    LOOP
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

        -- Update cashier stock
        PERFORM update_cashier_stock(
            (v_item->>'product_id')::UUID,
            p_cashier_id,
            -(v_item->>'quantity')::INTEGER
        );
    END LOOP;

    -- Insert sales taxes if any
    IF p_sales_taxes IS NOT NULL THEN
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

    -- Return the created sale
    RETURN QUERY
    SELECT 
        s.id,
        s.payment_method,
        s.status,
        s.total,
        s.created_at
    FROM sales s
    WHERE s.id = v_sale_id;
END;
$$;