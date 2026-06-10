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
    quantity INTEGER NOT NULL,
    cost NUMERIC(10, 2),
    category TEXT
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
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    avatar_url TEXT
);


-- 3. INSERT SEED DATA

-- Insert cash sessions (closed by default)
INSERT INTO cash_sessions (id, status, opened_at, closed_at, initial_amount, expected_amount, counted_amount, is_opened, notes) VALUES
('active', 'CERRADA', '', NULL, 0.00, 0.00, NULL, FALSE, 'Sesión inicial cerrada.');

-- Insert users
INSERT INTO users (id, name, role, shift, username, email, password, avatar_url) VALUES
('user-1', 'Admin MTA', 'ADMIN', 'MAÑANA', 'AdminMTA', 'miligantennisacademy@gmail.com', 'Control2026', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80');

