-- StockSense Core Database Schema
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_name VARCHAR(100) NOT NULL,
    type VARCHAR(30) CHECK (type IN ('internal', 'vendor', 'customer', 'inventory_loss')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(100),
    uom VARCHAR(20) DEFAULT 'units',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_no VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(30) CHECK (type IN ('receipt', 'delivery', 'internal')) NOT NULL,
    partner_name VARCHAR(200),
    source_location_id UUID REFERENCES locations(id),
    destination_location_id UUID REFERENCES locations(id),
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'waiting', 'ready', 'done', 'canceled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID REFERENCES operations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    source_location_id UUID REFERENCES locations(id),
    destination_location_id UUID REFERENCES locations(id),
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_ledger_product ON stock_ledger(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_source ON stock_ledger(source_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_dest ON stock_ledger(destination_location_id);
