-- 1. DROP TABLES IF THEY EXIST (For clean setup)
DROP TABLE IF EXISTS venta_items CASCADE;
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS customer_debts CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS cash_movements CASCADE;
DROP TABLE IF EXISTS cash_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. CREATE TABLES

-- Table: products
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    cost NUMERIC(10, 2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    sku TEXT NOT NULL UNIQUE,
    image_url TEXT
);

-- Table: customers
CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    credit_limit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    current_debt NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_purchases INTEGER NOT NULL DEFAULT 0
);

-- Table: customer_debts (Historial de fiados)
CREATE TABLE customer_debts (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    product_name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    quantity INTEGER NOT NULL
);

-- Table: ventas
CREATE TABLE ventas (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    customer_id TEXT NOT NULL, -- 'general' o id del cliente
    customer_name TEXT NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL, -- 'EFECTIVO' | 'YAPE' | 'PLIN' | 'CREDITO' | 'MIXTO'
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    pending_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cashier_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETADA' -- 'COMPLETADA' | 'ANULADA'
);

-- Table: venta_items
CREATE TABLE venta_items (
    id BIGSERIAL PRIMARY KEY,
    venta_id TEXT NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    quantity INTEGER NOT NULL
);

-- Table: cash_movements
CREATE TABLE cash_movements (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL, -- 'INGRESO' | 'EGRESO'
    concept TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL
);

-- Table: cash_sessions
CREATE TABLE cash_sessions (
    id TEXT PRIMARY KEY, -- 'active' para la sesión única o id único
    status TEXT NOT NULL DEFAULT 'CERRADA', -- 'ABIERTA' | 'CERRADA'
    opened_at TEXT NOT NULL,
    closed_at TEXT,
    initial_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expected_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    counted_amount NUMERIC(10, 2),
    is_opened BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT
);

-- Table: users
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- 'ADMIN' | 'VENDEDOR'
    shift TEXT NOT NULL, -- 'MAÑANA' | 'TARDE'
    avatar_url TEXT
);


-- 3. INSERT SEED DATA

-- Insert products
INSERT INTO products (id, name, category, price, cost, stock, low_stock_threshold, sku, image_url) VALUES
('prod-1', 'Gatorade Cool Blue 500ml', 'Bebidas', 4.50, 2.20, 24, 5, 'GAT-CB500', 'https://images.unsplash.com/photo-1571175351749-e8d06f275d85?w=500&auto=format&fit=crop&q=60'),
('prod-2', 'Quest Protein Bar Choco', 'Snacks', 12.00, 6.85, 12, 3, 'QS-PB-CHO', 'https://images.unsplash.com/photo-1622484211148-716598e04141?w=500&auto=format&fit=crop&q=60'),
('prod-3', 'Agua San Mateo 600ml', 'Bebidas', 2.50, 1.10, 5, 10, 'ASM-600', 'https://images.unsplash.com/photo-1608885898957-a599fb16ec18?w=500&auto=format&fit=crop&q=60'),
('prod-4', 'Galletas Integrales 6pk', 'Galletas', 3.80, 1.90, 40, 8, 'GAL-INT-6', 'https://images.unsplash.com/photo-1558961309-dbdf0003ed31?w=500&auto=format&fit=crop&q=60'),
('prod-5', 'Coca Cola 500ml', 'Bebidas', 3.50, 1.50, 50, 10, 'CC-500ML', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60'),
('prod-6', 'Oreo Original', 'Galletas', 2.50, 1.20, 15, 5, 'OREO-1R', 'https://images.unsplash.com/photo-1558961309-dbdf000efec1?w=500&auto=format&fit=crop&q=60'),
('prod-7', 'Chizitos Clasicos', 'Snacks', 1.50, 0.70, 4, 5, 'CHZ-001', 'https://images.unsplash.com/photo-1599490659213-e2b9527ec087?w=500&auto=format&fit=crop&q=60'),
('prod-8', 'Sublime Chocolate', 'Chocolates', 3.00, 1.30, 35, 8, 'SUB-CHO', 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=500&auto=format&fit=crop&q=60'),
('prod-9', 'Agua Mineral H2O 500ml', 'Bebidas', 2.00, 0.85, 142, 15, 'H2O-102', 'https://images.unsplash.com/photo-1548839130-ad1c2e08c4f8?w=500&auto=format&fit=crop&q=60'),
('prod-10', 'Isotónica Blue 600ml', 'Bebidas', 3.25, 1.50, 64, 10, 'ISO-882', 'https://images.unsplash.com/photo-1548839130-ad1c2e08c4f8?w=500&auto=format&fit=crop&q=60'),
('prod-11', 'Gomitas Loops Dulces', 'Dulces', 2.00, 0.90, 55, 10, 'GOMI-L1', 'https://images.unsplash.com/photo-1581798459219-318e76aeef7b?w=500&auto=format&fit=crop&q=60');

-- Insert customers
INSERT INTO customers (id, name, phone, credit_limit, current_debt, total_purchases) VALUES
('cust-1', 'Juan Pérez', '987654321', 50.00, 25.00, 125),
('cust-2', 'Carlos Ramos', '912345678', 50.00, 12.00, 62),
('cust-3', 'María López', '951357246', 50.00, 8.50, 45),
('cust-4', 'Roberto Gómez', '999888777', 100.00, 0.00, 15),
('cust-5', 'Esteban Quispe', '933555222', 40.00, 0.00, 32);

-- Insert customer debts
INSERT INTO customer_debts (id, customer_id, date, product_name, price, quantity) VALUES
('deb-1', 'cust-1', '2026-06-04 08:30', 'Gatorade Blue Bolt', 8.50, 1),
('deb-2', 'cust-1', '2026-06-05 16:15', 'Coca Cola 500ml', 4.50, 1),
('deb-3', 'cust-1', '2026-06-06 07:05', 'Barra Proteica Quest', 12.00, 1),
('deb-4', 'cust-2', '2026-06-05 11:20', 'Agua San Luis 1L', 3.50, 1),
('deb-5', 'cust-2', '2026-06-05 11:22', 'Galletones Avena', 8.50, 1),
('deb-6', 'cust-3', '2026-06-06 10:10', 'Gatorade Tropical', 8.50, 1);

-- Insert ventas
INSERT INTO ventas (id, timestamp, customer_id, customer_name, total, payment_method, paid_amount, pending_amount, cashier_name, status) VALUES
('TRX-8921', '2026-06-06 14:22', 'cust-1', 'Juan Pérez', 26.50, 'EFECTIVO', 26.50, 0, 'Admin User', 'COMPLETADA'),
('TRX-8920', '2026-06-06 14:15', 'general', 'Venta General', 5.00, 'YAPE', 5.00, 0, 'Admin User', 'COMPLETADA'),
('TRX-8919', '2026-06-06 14:02', 'cust-3', 'María López', 18.50, 'MIXTO', 10.00, 8.50, 'Admin User', 'COMPLETADA'),
('TRX-8910', '2026-06-05 10:15', 'cust-2', 'Carlos Ramos', 24.00, 'CREDITO', 0, 24.00, 'Admin User', 'COMPLETADA');

-- Insert venta items
INSERT INTO venta_items (venta_id, product_id, product_name, price, quantity) VALUES
('TRX-8921', 'prod-2', 'Quest Protein Bar Choco', 12.00, 2),
('TRX-8921', 'prod-3', 'Agua San Mateo 600ml', 2.50, 1),
('TRX-8920', 'prod-3', 'Agua San Mateo 600ml', 2.50, 2),
('TRX-8919', 'prod-1', 'Gatorade Cool Blue 500ml', 4.50, 2),
('TRX-8919', 'prod-5', 'Coca Cola 500ml', 3.50, 2),
('TRX-8919', 'prod-6', 'Oreo Original', 2.50, 1),
('TRX-8910', 'prod-2', 'Quest Protein Bar Choco', 12.00, 2);

-- Insert cash movements
INSERT INTO cash_movements (id, timestamp, type, concept, category, amount) VALUES
('mov-1', '2026-06-06 08:15', 'EGRESO', 'Pago Proveedor Bebidas', 'Proveedor', 150.00),
('mov-2', '2026-06-06 09:40', 'INGRESO', 'Venta Kit Entrenamiento', 'Oficina / Merch', 450.00),
('mov-3', '2026-06-06 11:10', 'EGRESO', 'Reparación Cafetera', 'Mantenimiento', 85.00),
('mov-4', '2026-06-06 13:05', 'INGRESO', 'Venta Suplementos', 'Suplementos Extra', 120.00);

-- Insert cash sessions
INSERT INTO cash_sessions (id, status, opened_at, closed_at, initial_amount, expected_amount, counted_amount, is_opened, notes) VALUES
('active', 'ABIERTA', '2026-06-06 08:00', NULL, 250.00, 2827.50, NULL, TRUE, 'Turno de mañana activo.');

-- Insert users
INSERT INTO users (id, name, role, shift, avatar_url) VALUES
('user-1', 'Admin User', 'ADMIN', 'MAÑANA', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'),
('user-2', 'Vendedor User', 'VENDEDOR', 'TARDE', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80');
