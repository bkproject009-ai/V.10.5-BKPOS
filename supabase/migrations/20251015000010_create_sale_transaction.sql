-- Function to handle complete sale transaction
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
BEGIN
    -- Start transaction implicitly by making changes
    
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

    -- Insert sale items and update stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_sale_items)
    LOOP
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

        -- Update cashier stock
        WITH current_stock AS (
            SELECT stock
            FROM cashier_stock
            WHERE product_id = (v_item->>'product_id')::UUID
            AND cashier_id = p_cashier_id
            FOR UPDATE -- Lock the row
        )
        INSERT INTO cashier_stock (
            cashier_id,
            product_id,
            stock
        )
        VALUES (
            p_cashier_id,
            (v_item->>'product_id')::UUID,
            (v_item->>'quantity')::INTEGER * -1
        )
        ON CONFLICT (cashier_id, product_id)
        DO UPDATE SET
            stock = cashier_stock.stock - (v_item->>'quantity')::INTEGER,
            updated_at = NOW()
        WHERE cashier_stock.stock >= (v_item->>'quantity')::INTEGER; -- Ensure sufficient stock

        -- Update product total stock
        UPDATE products
        SET stock = (
            SELECT COALESCE(SUM(stock), 0)
            FROM cashier_stock
            WHERE product_id = (v_item->>'product_id')::UUID
        ) + storage_stock,
        updated_at = NOW()
        WHERE id = (v_item->>'product_id')::UUID;
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

    -- Transaction will be committed automatically if no errors occur
EXCEPTION
    WHEN OTHERS THEN
        -- Any error will cause automatic rollback
        RAISE;
END;
$$;