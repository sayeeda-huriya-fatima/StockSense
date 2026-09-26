
-- 1. LOCATIONS & CATEGORIES
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_name VARCHAR(100) NOT NULL,
    location_name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('internal', 'vendor', 'customer', 'inventory_loss'))
);

CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    category_id UUID REFERENCES product_categories(id),
    uom VARCHAR(20) NOT NULL,
    min_stock_alert INT DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. OPERATIONS & LEDGER
CREATE TABLE operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_no VARCHAR(50) UNIQUE NOT NULL,
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('receipt', 'delivery', 'internal', 'adjustment')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'waiting', 'ready', 'done', 'canceled')),
    source_location_id UUID REFERENCES locations(id),
    destination_location_id UUID REFERENCES locations(id),
    partner_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    validated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE operation_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0)
);

CREATE TABLE stock_moves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID REFERENCES operations(id),
    product_id UUID REFERENCES products(id),
    from_location_id UUID REFERENCES locations(id),
    to_location_id UUID REFERENCES locations(id),
    quantity NUMERIC(12, 2) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stock_moves_product ON stock_moves(product_id);
CREATE INDEX idx_stock_moves_locations ON stock_moves(from_location_id, to_location_id);

-- 3. FUNCTIONS
CREATE OR REPLACE FUNCTION get_current_stock(p_product_id UUID, p_location_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    in_stock NUMERIC := 0;
    out_stock NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(quantity), 0) INTO in_stock
    FROM stock_moves
    WHERE product_id = p_product_id AND to_location_id = p_location_id;

    SELECT COALESCE(SUM(quantity), 0) INTO out_stock
    FROM stock_moves
    WHERE product_id = p_product_id AND from_location_id = p_location_id;

    RETURN (in_stock - out_stock);
END;
$$;

CREATE OR REPLACE FUNCTION validate_operation(p_operation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_op RECORD;
    v_line RECORD;
    v_src_loc RECORD;
    v_avail_stock NUMERIC;
BEGIN
    SELECT * INTO v_op FROM operations WHERE id = p_operation_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Operation not found.';
    END IF;
    IF v_op.status = 'done' THEN
        RAISE EXCEPTION 'Operation is already completed.';
    END IF;

    SELECT * INTO v_src_loc FROM locations WHERE id = v_op.source_location_id;

    FOR v_line IN SELECT * FROM operation_lines WHERE operation_id = p_operation_id
    LOOP
        IF v_src_loc.type = 'internal' THEN
            v_avail_stock := get_current_stock(v_line.product_id, v_op.source_location_id);
            IF v_avail_stock < v_line.quantity THEN
                RAISE EXCEPTION 'Zero-Negative Integrity: Only % available at source, demanded %.', 
                    v_avail_stock, v_line.quantity;
            END IF;
        END IF;

        INSERT INTO stock_moves (operation_id, product_id, from_location_id, to_location_id, quantity)
        VALUES (v_op.id, v_line.product_id, v_op.source_location_id, v_op.destination_location_id, v_line.quantity);
    END LOOP;

    UPDATE operations 
    SET status = 'done', validated_at = NOW() 
    WHERE id = p_operation_id;

    RETURN jsonb_build_object('success', true, 'status', 'done');
END;
$$;

CREATE OR REPLACE FUNCTION create_operation_with_lines(
    p_reference_no TEXT,
    p_operation_type VARCHAR(20),
    p_source_location_id UUID,
    p_destination_location_id UUID,
    p_partner_name TEXT,
    p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_op_id UUID;
    v_item RECORD;
BEGIN
    INSERT INTO operations (
        reference_no,
        operation_type,
        status,
        source_location_id,
        destination_location_id,
        partner_name
    )
    VALUES (
        p_reference_no,
        p_operation_type,
        'draft',
        p_source_location_id,
        p_destination_location_id,
        p_partner_name
    )
    RETURNING id INTO v_op_id;

    FOR v_item IN 
        SELECT * FROM jsonb_to_recordset(p_items) AS (product_id UUID, quantity NUMERIC)
    LOOP
        INSERT INTO operation_lines (operation_id, product_id, quantity)
        VALUES (v_op_id, v_item.product_id, v_item.quantity);
    END LOOP;

    RETURN v_op_id;
END;
$$;

