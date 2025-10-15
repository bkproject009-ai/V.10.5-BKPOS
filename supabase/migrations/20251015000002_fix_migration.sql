-- SCRIPT MIGRASI BKPOS V.10.4
-- Jalankan script ini di Supabase SQL Editor

BEGIN;

-- Step 1: Drop dependent views
--------------------------------------------------------------------------------
DROP VIEW IF EXISTS cashier_products;

-- Step 2: Create new tables
--------------------------------------------------------------------------------
-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create SKU counter table
CREATE TABLE IF NOT EXISTS sku_counter (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_code VARCHAR(50) NOT NULL REFERENCES categories(code),
    last_number INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 3: Add default categories
--------------------------------------------------------------------------------
INSERT INTO categories (code, name, description) 
VALUES 
    ('GEN', 'General', 'Produk Umum'),
    ('FNB', 'Food & Beverage', 'Makanan dan Minuman'),
    ('ELC', 'Electronics', 'Elektronik'),
    ('FSH', 'Fashion', 'Pakaian dan Aksesoris'),
    ('HCS', 'Health & Cosmetics', 'Kesehatan dan Kosmetik')
ON CONFLICT (code) DO UPDATE 
SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Step 4: Alter existing tables
--------------------------------------------------------------------------------
-- Backup existing category data
CREATE TEMP TABLE product_categories AS
SELECT id, category FROM products WHERE category IS NOT NULL;

-- Add category foreign key to products
ALTER TABLE products 
    DROP COLUMN IF EXISTS category,
    ADD COLUMN category_id UUID REFERENCES categories(id);

-- Map old categories to new ones (default to 'GEN' if no match)
UPDATE products p
SET category_id = c.id
FROM categories c, product_categories pc
WHERE p.id = pc.id
AND (
    CASE 
        WHEN pc.category ILIKE '%makanan%' OR pc.category ILIKE '%minuman%' THEN c.code = 'FNB'
        WHEN pc.category ILIKE '%elektronik%' THEN c.code = 'ELC'
        WHEN pc.category ILIKE '%pakaian%' OR pc.category ILIKE '%fashion%' THEN c.code = 'FSH'
        WHEN pc.category ILIKE '%kesehatan%' OR pc.category ILIKE '%kosmetik%' THEN c.code = 'HCS'
        ELSE c.code = 'GEN'
    END
);

-- Step 5: Recreate view with new category structure
--------------------------------------------------------------------------------
CREATE OR REPLACE VIEW cashier_products AS
SELECT 
    p.id,
    p.name,
    p.price,
    p.stock,
    c.name as category,
    p.sku,
    p.description,
    p.image,
    cs.stock as cashier_stock
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN cashier_stock cs ON p.id = cs.product_id;

[... rest of the script remains the same ...]