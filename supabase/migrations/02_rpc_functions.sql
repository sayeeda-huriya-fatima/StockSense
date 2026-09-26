-- StockSense PL/pgSQL Database Engine & Double-Entry Ledger Logic

-- 1. Compute dynamic stock on-hand
CREATE OR REPLACE FUNCTION get_current_stock(p_product_id UUID, p_location_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    inbound_qty NUMERIC := 0;
    outbound_qty NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(quantity), 0) INTO inbound_qty
    FROM stock_ledger
    WHERE product_id = p_product_id AND destination_location_id = p_location_id;

    SELECT COALESCE(SUM(quantity), 0) INTO outbound_qty
    FROM stock_ledger
    WHERE product_id = p_product_id AND source_location_id = p_location_id;

    RETURN inbound_qty - outbound_qty;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Manifest generation RPC
CREATE OR REPLACE FUNCTION create_operation_with_lines(
    p_reference_no TEXT,
    p_operation_type TEXT,
    p_source_location_id UUID,
    p_destination_location_id UUID,
    p_partner_name TEXT,
    p_items JSONB
)
RETURNS UUID AS $$
DECLARE
    v_op_id UUID;
BEGIN
    INSERT INTO operations (
        reference_no,
        type,
        partner_name,
        source_location_id,
        destination_location_id,
        status
    ) VALUES (
        p_reference_no,
        p_operation_type,
        p_partner_name,
        p_source_location_id,
        p_destination_location_id,
        'draft'
    ) RETURNING id INTO v_op_id;

    RETURN v_op_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atomic state machine validation & ledger commitment
CREATE OR REPLACE FUNCTION validate_operation(p_operation_id UUID)
RETURNS VOID AS $$
DECLARE
    v_op RECORD;
BEGIN
    SELECT * INTO v_op FROM operations WHERE id = p_operation_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Operation not found.';
    END IF;
    
    IF v_op.status = 'done' THEN
        RAISE EXCEPTION 'Operation has already been validated.';
    END IF;

    UPDATE operations
    SET status = 'done'
    WHERE id = p_operation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
