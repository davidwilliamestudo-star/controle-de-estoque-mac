-- =============================================================
-- MIGRATION 001 — Schema Inicial
-- Sistema: Controle de Estoque — Dra. Ana Morong
-- Banco: SQLite (via @tauri-apps/plugin-sql)
-- =============================================================

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- -------------------------------------------------------
-- 1. users
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  clinic_id     TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',
  is_active     INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at    TEXT
);

-- -------------------------------------------------------
-- 2. patients
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
  id           TEXT PRIMARY KEY,
  clinic_id    TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  full_name    TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  birth_date   TEXT,
  notes        TEXT,
  alert_notes  TEXT,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_patients_clinic ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name);
CREATE INDEX IF NOT EXISTS idx_patients_active ON patients(is_active);

-- -------------------------------------------------------
-- 3. inventory_categories
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_categories (
  id          TEXT PRIMARY KEY,
  clinic_id   TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  name        TEXT NOT NULL,
  description TEXT,
  applies_to  TEXT, -- medication|material|equipment|all
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at  TEXT
);

-- -------------------------------------------------------
-- 4. administration_routes
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS administration_routes (
  id          TEXT PRIMARY KEY,
  clinic_id   TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  name        TEXT NOT NULL,
  description TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at  TEXT
);

-- -------------------------------------------------------
-- 5. body_areas
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS body_areas (
  id            TEXT PRIMARY KEY,
  clinic_id     TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  svg_region_id TEXT,
  description   TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- -------------------------------------------------------
-- 6. route_body_areas
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS route_body_areas (
  id                      TEXT PRIMARY KEY,
  clinic_id               TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  administration_route_id TEXT NOT NULL REFERENCES administration_routes(id),
  body_area_id            TEXT NOT NULL REFERENCES body_areas(id),
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(administration_route_id, body_area_id)
);

-- -------------------------------------------------------
-- 7. suppliers
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
  id         TEXT PRIMARY KEY,
  clinic_id  TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  name       TEXT NOT NULL,
  phone      TEXT,
  email      TEXT,
  document   TEXT,
  notes      TEXT,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

-- -------------------------------------------------------
-- 8. inventory_items
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_items (
  id                      TEXT PRIMARY KEY,
  clinic_id               TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  name                    TEXT NOT NULL,
  item_type               TEXT NOT NULL CHECK(item_type IN ('medication','material','equipment','other')),
  category_id             TEXT REFERENCES inventory_categories(id),
  administration_route_id TEXT REFERENCES administration_routes(id),
  unit                    TEXT NOT NULL DEFAULT 'un',
  current_stock           REAL NOT NULL DEFAULT 0,
  minimum_stock           REAL NOT NULL DEFAULT 0,
  requires_batch          INTEGER NOT NULL DEFAULT 1,
  requires_expiration     INTEGER NOT NULL DEFAULT 1,
  supplier_id             TEXT REFERENCES suppliers(id),
  notes                   TEXT,
  is_active               INTEGER NOT NULL DEFAULT 1,
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at              TEXT
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_type ON inventory_items(item_type);
CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON inventory_items(is_active);

-- -------------------------------------------------------
-- 9. inventory_batches
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_batches (
  id                TEXT PRIMARY KEY,
  clinic_id         TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id),
  batch_number      TEXT NOT NULL,
  expiration_date   TEXT,
  supplier_id       TEXT REFERENCES suppliers(id),
  entry_date        TEXT NOT NULL DEFAULT (date('now')),
  initial_quantity  REAL NOT NULL,
  current_quantity  REAL NOT NULL,
  unit_cost         REAL,
  invoice_number    TEXT,
  notes             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at        TEXT
);

CREATE INDEX IF NOT EXISTS idx_batches_item ON inventory_batches(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiration ON inventory_batches(expiration_date);

-- -------------------------------------------------------
-- 10. stock_movements
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_movements (
  id                 TEXT PRIMARY KEY,
  clinic_id          TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  inventory_item_id  TEXT NOT NULL REFERENCES inventory_items(id),
  inventory_batch_id TEXT REFERENCES inventory_batches(id),
  movement_type      TEXT NOT NULL CHECK(movement_type IN ('entry','exit','automatic_exit','adjustment','loss','expired','correction')),
  quantity           REAL NOT NULL,
  unit               TEXT NOT NULL,
  reason             TEXT,
  patient_id         TEXT REFERENCES patients(id),
  protocol_id        TEXT,
  procedure_id       TEXT,
  user_id            TEXT REFERENCES users(id),
  movement_date      TEXT NOT NULL DEFAULT (datetime('now')),
  notes              TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_movements_item ON stock_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_movements_patient ON stock_movements(patient_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON stock_movements(movement_date);

-- -------------------------------------------------------
-- 11. evolution_templates
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS evolution_templates (
  id                      TEXT PRIMARY KEY,
  clinic_id               TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  name                    TEXT NOT NULL,
  template_text           TEXT NOT NULL,
  applies_to_protocol_id  TEXT,
  is_default              INTEGER NOT NULL DEFAULT 0,
  is_active               INTEGER NOT NULL DEFAULT 1,
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at              TEXT
);

-- -------------------------------------------------------
-- 12. protocols
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS protocols (
  id                           TEXT PRIMARY KEY,
  clinic_id                    TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  name                         TEXT NOT NULL,
  category_id                  TEXT REFERENCES inventory_categories(id),
  administration_route_id      TEXT REFERENCES administration_routes(id),
  description                  TEXT,
  internal_notes               TEXT,
  default_evolution_template_id TEXT REFERENCES evolution_templates(id),
  is_active                    INTEGER NOT NULL DEFAULT 1,
  created_at                   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                   TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at                   TEXT
);

-- -------------------------------------------------------
-- 13. protocol_items
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS protocol_items (
  id                TEXT PRIMARY KEY,
  clinic_id         TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  protocol_id       TEXT NOT NULL REFERENCES protocols(id),
  inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id),
  item_role         TEXT NOT NULL CHECK(item_role IN ('medication','material','equipment','other')),
  default_quantity  REAL NOT NULL DEFAULT 1,
  unit              TEXT NOT NULL DEFAULT 'un',
  is_required       INTEGER NOT NULL DEFAULT 1,
  notes             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at        TEXT
);

-- -------------------------------------------------------
-- 14. appointments
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id                      TEXT PRIMARY KEY,
  clinic_id               TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  patient_id              TEXT NOT NULL REFERENCES patients(id),
  appointment_type        TEXT NOT NULL CHECK(appointment_type IN ('application','consultation','return','other')),
  status                  TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','confirmed','done','missed','cancelled')),
  scheduled_at            TEXT NOT NULL,
  duration_minutes        INTEGER NOT NULL DEFAULT 60,
  notes                   TEXT,
  patient_email_snapshot  TEXT,
  google_calendar_event_id TEXT,
  sync_status             TEXT NOT NULL DEFAULT 'not_synced' CHECK(sync_status IN ('not_synced','pending','synced','failed')),
  last_sync_attempt_at    TEXT,
  sync_error              TEXT,
  created_by_user_id      TEXT REFERENCES users(id),
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at              TEXT
);

-- -------------------------------------------------------
-- 15. procedures
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS procedures (
  id                        TEXT PRIMARY KEY,
  clinic_id                 TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  patient_id                TEXT NOT NULL REFERENCES patients(id),
  protocol_id               TEXT REFERENCES protocols(id),
  appointment_id            TEXT REFERENCES appointments(id),
  body_area_id              TEXT REFERENCES body_areas(id),
  performed_at              TEXT NOT NULL DEFAULT (datetime('now')),
  status                    TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','ready_to_finalize','finalized','cancelled')),
  had_intercurrence         INTEGER NOT NULL DEFAULT 0,
  intercurrence_description TEXT,
  notes                     TEXT,
  evolution_text            TEXT,
  responsible_user_id       TEXT REFERENCES users(id),
  finalized_at              TEXT,
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at                TEXT
);

CREATE INDEX IF NOT EXISTS idx_procedures_patient ON procedures(patient_id);
CREATE INDEX IF NOT EXISTS idx_procedures_status ON procedures(status);
CREATE INDEX IF NOT EXISTS idx_procedures_date ON procedures(performed_at);

-- -------------------------------------------------------
-- 16. procedure_items_used
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS procedure_items_used (
  id                       TEXT PRIMARY KEY,
  clinic_id                TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  procedure_id             TEXT NOT NULL REFERENCES procedures(id),
  inventory_item_id        TEXT NOT NULL REFERENCES inventory_items(id),
  inventory_batch_id       TEXT REFERENCES inventory_batches(id),
  item_type                TEXT NOT NULL,
  quantity_used            REAL NOT NULL,
  unit                     TEXT NOT NULL,
  batch_number_snapshot    TEXT,
  expiration_date_snapshot TEXT,
  notes                    TEXT,
  created_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_proc_items_procedure ON procedure_items_used(procedure_id);
CREATE INDEX IF NOT EXISTS idx_proc_items_item ON procedure_items_used(inventory_item_id);

-- -------------------------------------------------------
-- 17. audit_logs
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id              TEXT PRIMARY KEY,
  clinic_id       TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  user_id         TEXT REFERENCES users(id),
  action          TEXT NOT NULL,
  entity_type     TEXT,
  entity_id       TEXT,
  description     TEXT,
  before_data     TEXT, -- JSON string
  after_data      TEXT, -- JSON string
  device_info     TEXT,
  hash_previous   TEXT,
  hash_current    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- -------------------------------------------------------
-- 18. settings
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id         TEXT PRIMARY KEY,
  clinic_id  TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  key        TEXT NOT NULL,
  value      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(clinic_id, key)
);
