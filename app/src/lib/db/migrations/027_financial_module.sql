-- =============================================================
-- MIGRATION 027 — Módulo Financeiro (Custos e Preços)
-- Sistema: Controle de Estoque — Dra. Ana Morong
-- =============================================================

-- 1. Adicionar campos financeiros em inventory_items
ALTER TABLE inventory_items ADD COLUMN cost_price REAL NOT NULL DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN selling_price REAL NOT NULL DEFAULT 0;

-- 2. Adicionar campos financeiros em protocols
ALTER TABLE protocols ADD COLUMN base_price REAL NOT NULL DEFAULT 0;

-- 3. Adicionar campos financeiros em procedures
ALTER TABLE procedures ADD COLUMN subtotal REAL NOT NULL DEFAULT 0;
ALTER TABLE procedures ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE procedures ADD COLUMN discount_type TEXT NOT NULL DEFAULT 'fixed'; -- 'fixed' ou 'percentage'
ALTER TABLE procedures ADD COLUMN total_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE procedures ADD COLUMN payment_method TEXT; -- 'pix', 'credit', 'debit', 'cash', etc.
ALTER TABLE procedures ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending'; -- 'pending', 'paid'
