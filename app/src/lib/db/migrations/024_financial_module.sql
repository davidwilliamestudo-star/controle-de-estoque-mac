-- =============================================================
-- MIGRATION 024 - Financial module
-- =============================================================

CREATE TABLE IF NOT EXISTS financial_categories (
  id         TEXT PRIMARY KEY,
  clinic_id  TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK(type IN ('income','expense','both')),
  parent_id  TEXT REFERENCES financial_categories(id),
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_financial_categories_type ON financial_categories(type);
CREATE INDEX IF NOT EXISTS idx_financial_categories_active ON financial_categories(is_active);

CREATE TABLE IF NOT EXISTS financial_payment_methods (
  id         TEXT PRIMARY KEY,
  clinic_id  TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  name       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'other',
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_financial_payment_methods_active ON financial_payment_methods(is_active);

CREATE TABLE IF NOT EXISTS financial_receivables (
  id                TEXT PRIMARY KEY,
  clinic_id         TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  patient_id        TEXT REFERENCES patients(id),
  procedure_id      TEXT REFERENCES procedures(id),
  protocol_id       TEXT REFERENCES protocols(id),
  category_id       TEXT REFERENCES financial_categories(id),
  description       TEXT NOT NULL,
  amount            REAL NOT NULL CHECK(amount >= 0),
  paid_amount       REAL NOT NULL DEFAULT 0 CHECK(paid_amount >= 0),
  due_date          TEXT NOT NULL,
  paid_at           TEXT,
  payment_method_id TEXT REFERENCES financial_payment_methods(id),
  status            TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','paid','overdue','cancelled','partially_paid')),
  notes             TEXT,
  created_by_user_id TEXT REFERENCES users(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at        TEXT
);

CREATE INDEX IF NOT EXISTS idx_financial_receivables_status ON financial_receivables(status);
CREATE INDEX IF NOT EXISTS idx_financial_receivables_due_date ON financial_receivables(due_date);
CREATE INDEX IF NOT EXISTS idx_financial_receivables_paid_at ON financial_receivables(paid_at);
CREATE INDEX IF NOT EXISTS idx_financial_receivables_patient ON financial_receivables(patient_id);
CREATE INDEX IF NOT EXISTS idx_financial_receivables_procedure ON financial_receivables(procedure_id);
CREATE INDEX IF NOT EXISTS idx_financial_receivables_protocol ON financial_receivables(protocol_id);
CREATE INDEX IF NOT EXISTS idx_financial_receivables_category ON financial_receivables(category_id);

CREATE TABLE IF NOT EXISTS financial_payables (
  id                  TEXT PRIMARY KEY,
  clinic_id           TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  supplier_id         TEXT REFERENCES suppliers(id),
  inventory_receipt_id TEXT REFERENCES inventory_receipts(id),
  category_id         TEXT REFERENCES financial_categories(id),
  description         TEXT NOT NULL,
  amount              REAL NOT NULL CHECK(amount >= 0),
  paid_amount         REAL NOT NULL DEFAULT 0 CHECK(paid_amount >= 0),
  due_date            TEXT NOT NULL,
  paid_at             TEXT,
  payment_method_id   TEXT REFERENCES financial_payment_methods(id),
  status              TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','paid','overdue','cancelled','partially_paid')),
  notes               TEXT,
  created_by_user_id  TEXT REFERENCES users(id),
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at          TEXT
);

CREATE INDEX IF NOT EXISTS idx_financial_payables_status ON financial_payables(status);
CREATE INDEX IF NOT EXISTS idx_financial_payables_due_date ON financial_payables(due_date);
CREATE INDEX IF NOT EXISTS idx_financial_payables_paid_at ON financial_payables(paid_at);
CREATE INDEX IF NOT EXISTS idx_financial_payables_supplier ON financial_payables(supplier_id);
CREATE INDEX IF NOT EXISTS idx_financial_payables_receipt ON financial_payables(inventory_receipt_id);
CREATE INDEX IF NOT EXISTS idx_financial_payables_category ON financial_payables(category_id);

CREATE TABLE IF NOT EXISTS financial_payments (
  id                TEXT PRIMARY KEY,
  clinic_id         TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  direction         TEXT NOT NULL CHECK(direction IN ('in','out')),
  receivable_id     TEXT REFERENCES financial_receivables(id),
  payable_id        TEXT REFERENCES financial_payables(id),
  amount            REAL NOT NULL CHECK(amount > 0),
  paid_at           TEXT NOT NULL DEFAULT (datetime('now')),
  payment_method_id TEXT REFERENCES financial_payment_methods(id),
  notes             TEXT,
  created_by_user_id TEXT REFERENCES users(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK(
    (direction = 'in' AND receivable_id IS NOT NULL AND payable_id IS NULL)
    OR
    (direction = 'out' AND payable_id IS NOT NULL AND receivable_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_financial_payments_receivable ON financial_payments(receivable_id);
CREATE INDEX IF NOT EXISTS idx_financial_payments_payable ON financial_payments(payable_id);
CREATE INDEX IF NOT EXISTS idx_financial_payments_paid_at ON financial_payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_financial_payments_method ON financial_payments(payment_method_id);

CREATE TABLE IF NOT EXISTS financial_cash_movements (
  id                TEXT PRIMARY KEY,
  clinic_id         TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  movement_type     TEXT NOT NULL CHECK(movement_type IN ('income','expense')),
  source_type       TEXT NOT NULL CHECK(source_type IN ('receivable','payable','manual','procedure','inventory_receipt')),
  source_id         TEXT,
  category_id       TEXT REFERENCES financial_categories(id),
  payment_method_id TEXT REFERENCES financial_payment_methods(id),
  description       TEXT NOT NULL,
  amount            REAL NOT NULL CHECK(amount >= 0),
  movement_date     TEXT NOT NULL,
  is_realized       INTEGER NOT NULL DEFAULT 0,
  notes             TEXT,
  created_by_user_id TEXT REFERENCES users(id),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at        TEXT
);

CREATE INDEX IF NOT EXISTS idx_financial_cash_movements_date ON financial_cash_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_financial_cash_movements_type ON financial_cash_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_financial_cash_movements_realized ON financial_cash_movements(is_realized);
CREATE INDEX IF NOT EXISTS idx_financial_cash_movements_source ON financial_cash_movements(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_financial_cash_movements_category ON financial_cash_movements(category_id);

INSERT OR IGNORE INTO financial_categories (id, clinic_id, name, type) VALUES
  ('fin-cat-income-procedures', 'ana-morong-clinic', 'Procedimentos', 'income'),
  ('fin-cat-income-consultations', 'ana-morong-clinic', 'Consultas', 'income'),
  ('fin-cat-income-returns', 'ana-morong-clinic', 'Retornos', 'income'),
  ('fin-cat-income-products', 'ana-morong-clinic', 'Produtos', 'income'),
  ('fin-cat-income-other', 'ana-morong-clinic', 'Outros recebimentos', 'income'),
  ('fin-cat-exp-medications', 'ana-morong-clinic', 'Compra de medicamentos', 'expense'),
  ('fin-cat-exp-materials', 'ana-morong-clinic', 'Compra de materiais', 'expense'),
  ('fin-cat-exp-suppliers', 'ana-morong-clinic', 'Fornecedores', 'expense'),
  ('fin-cat-exp-rent', 'ana-morong-clinic', 'Aluguel', 'expense'),
  ('fin-cat-exp-payroll', 'ana-morong-clinic', 'Salarios', 'expense'),
  ('fin-cat-exp-taxes', 'ana-morong-clinic', 'Impostos', 'expense'),
  ('fin-cat-exp-equipment', 'ana-morong-clinic', 'Equipamentos', 'expense'),
  ('fin-cat-exp-marketing', 'ana-morong-clinic', 'Marketing', 'expense'),
  ('fin-cat-exp-other', 'ana-morong-clinic', 'Outros custos', 'expense');

INSERT OR IGNORE INTO financial_payment_methods (id, clinic_id, name, type) VALUES
  ('fin-pay-cash', 'ana-morong-clinic', 'Dinheiro', 'cash'),
  ('fin-pay-pix', 'ana-morong-clinic', 'PIX', 'pix'),
  ('fin-pay-debit-card', 'ana-morong-clinic', 'Cartao de debito', 'debit_card'),
  ('fin-pay-credit-card', 'ana-morong-clinic', 'Cartao de credito', 'credit_card'),
  ('fin-pay-transfer', 'ana-morong-clinic', 'Transferencia', 'transfer'),
  ('fin-pay-bank-slip', 'ana-morong-clinic', 'Boleto', 'bank_slip'),
  ('fin-pay-other', 'ana-morong-clinic', 'Outro', 'other');
