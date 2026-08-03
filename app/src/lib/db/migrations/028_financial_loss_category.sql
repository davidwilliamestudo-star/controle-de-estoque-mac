-- =============================================================
-- MIGRATION 028 — Categoria de perdas de estoque no financeiro
-- =============================================================

INSERT OR IGNORE INTO financial_categories (id, clinic_id, name, type) VALUES
  ('fin-cat-exp-losses', 'ana-morong-clinic', 'Perdas de estoque', 'expense');
