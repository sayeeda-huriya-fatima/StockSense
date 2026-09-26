-- Seed initial infrastructure locations
INSERT INTO locations (id, location_name, type) VALUES
('a0000000-0000-0000-0000-000000000001', 'Suppliers Port Alpha', 'vendor'),
('a0000000-0000-0000-0000-000000000002', 'Central Warehouse (WH-Alpha)', 'internal'),
('a0000000-0000-0000-0000-000000000003', 'Retail Logistics Hub', 'customer')
ON CONFLICT (id) DO NOTHING;

-- Seed inventory SKU products
INSERT INTO products (id, name, sku, category, uom) VALUES
('b0000000-0000-0000-0000-000000000001', 'Industrial Micron Sensor', 'SNS-MIC-01', 'Electronics', 'units'),
('b0000000-0000-0000-0000-000000000002', 'Actuator Driver V4', 'ACT-DRV-04', 'Robotics', 'units'),
('b0000000-0000-0000-0000-000000000003', 'Fiberoptic Transceiver', 'TRX-FIB-10', 'Networking', 'units')
ON CONFLICT (sku) DO NOTHING;
