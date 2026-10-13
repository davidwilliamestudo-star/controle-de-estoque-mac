-- ================================================================
-- SCHEMA UNIFICADO CLOUDFLARE D1 (DRA. ANA MORONG)
-- Gerado automaticamente a partir de 28 migrations
-- ================================================================

-- >>> MIGRATION: 001_initial.sql <<<
-- =============================================================
-- MIGRATION 001 — Schema Inicial
-- Sistema: Controle de Estoque — Dra. Ana Morong
-- Banco: SQLite (via @tauri-apps/plugin-sql)
-- =============================================================




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


-- >>> MIGRATION: 002_seed_dev.sql <<<
-- =============================================================
-- MIGRATION 002 — Seed de Desenvolvimento
-- Dados iniciais para facilitar o desenvolvimento/testes
-- =============================================================

-- Settings da clínica
INSERT OR IGNORE INTO settings (id, clinic_id, key, value) VALUES
  ('set-01', 'ana-morong-clinic', 'clinic_name', 'Dra. Ana Morong'),
  ('set-02', 'ana-morong-clinic', 'professional_name', 'Dra. Ana Morong'),
  ('set-03', 'ana-morong-clinic', 'expiration_alert_days', '30'),
  ('set-04', 'ana-morong-clinic', 'auto_backup_enabled', 'true'),
  ('set-05', 'ana-morong-clinic', 'block_expired_items', 'true'),
  ('set-06', 'ana-morong-clinic', 'google_calendar_sync_enabled', 'false'),
  ('set-07', 'ana-morong-clinic', 'lock_after_minutes', '30');

-- Usuaria padrao (senha de desenvolvimento: Ana2026!)
INSERT OR IGNORE INTO users (id, clinic_id, name, email, password_hash, role, is_active) VALUES
  ('user-ana-01', 'ana-morong-clinic', 'Dra. Ana Morong', 'ana@morong.med.br',
   'pbkdf2_sha256$210000$D1o0rsNGe2aQ/YBYTbztZg==$yG6I9mTfYN2IqJeWGhRlLucJdb/yoqUw8afUG1xjcYU=', 'admin', 1);

-- Vias de aplicação
INSERT OR IGNORE INTO administration_routes (id, clinic_id, name, description, is_active) VALUES
  ('route-ev',   'ana-morong-clinic', 'Endovenosa',     'Via endovenosa (EV)', 1),
  ('route-im',   'ana-morong-clinic', 'Intramuscular',  'Via intramuscular (IM)', 1),
  ('route-sc',   'ana-morong-clinic', 'Subcutânea',     'Via subcutânea (SC)', 1),
  ('route-oral', 'ana-morong-clinic', 'Oral',           'Via oral', 1),
  ('route-top',  'ana-morong-clinic', 'Tópica',         'Uso tópico', 1),
  ('route-na',   'ana-morong-clinic', 'Não aplicável',  'Sem via de aplicação específica', 1);

-- Áreas corporais
INSERT OR IGNORE INTO body_areas (id, clinic_id, name, slug, svg_region_id, is_active) VALUES
  ('area-gluteo-d',    'ana-morong-clinic', 'Glúteo Direito',      'gluteo-direito',       'gluteo_d', 1),
  ('area-gluteo-e',    'ana-morong-clinic', 'Glúteo Esquerdo',     'gluteo-esquerdo',      'gluteo_e', 1),
  ('area-deltoide-d',  'ana-morong-clinic', 'Deltoide Direito',    'deltoide-direito',     'deltoide_d', 1),
  ('area-deltoide-e',  'ana-morong-clinic', 'Deltoide Esquerdo',   'deltoide-esquerdo',    'deltoide_e', 1),
  ('area-abdomen',     'ana-morong-clinic', 'Abdômen',             'abdomen',              'abdomen', 1),
  ('area-coxa-d',      'ana-morong-clinic', 'Coxa Direita',        'coxa-direita',         'coxa_d', 1),
  ('area-coxa-e',      'ana-morong-clinic', 'Coxa Esquerda',       'coxa-esquerda',        'coxa_e', 1),
  ('area-braco-d',     'ana-morong-clinic', 'Braço Direito',       'braco-direito',        'braco_d', 1),
  ('area-braco-e',     'ana-morong-clinic', 'Braço Esquerdo',      'braco-esquerdo',       'braco_e', 1),
  ('area-lombar',      'ana-morong-clinic', 'Região Lombar',       'regiao-lombar',        'lombar', 1),
  ('area-antebraco-d', 'ana-morong-clinic', 'Antebraço Direito',   'antebraco-direito',    'antebraco_d', 1),
  ('area-antebraco-e', 'ana-morong-clinic', 'Antebraço Esquerdo',  'antebraco-esquerdo',   'antebraco_e', 1),
  ('area-mao-d',       'ana-morong-clinic', 'Mão Direita',         'mao-direita',          'mao_d', 1),
  ('area-mao-e',       'ana-morong-clinic', 'Mão Esquerda',        'mao-esquerda',         'mao_e', 1);

-- Mapeamento Via → Áreas permitidas
-- Endovenosa: braços, antebraços, mãos
INSERT OR IGNORE INTO route_body_areas (id, clinic_id, administration_route_id, body_area_id) VALUES
  ('rba-ev-01', 'ana-morong-clinic', 'route-ev', 'area-braco-d'),
  ('rba-ev-02', 'ana-morong-clinic', 'route-ev', 'area-braco-e'),
  ('rba-ev-03', 'ana-morong-clinic', 'route-ev', 'area-antebraco-d'),
  ('rba-ev-04', 'ana-morong-clinic', 'route-ev', 'area-antebraco-e'),
  ('rba-ev-05', 'ana-morong-clinic', 'route-ev', 'area-mao-d'),
  ('rba-ev-06', 'ana-morong-clinic', 'route-ev', 'area-mao-e');

-- Intramuscular: glúteos, deltoides, coxas
INSERT OR IGNORE INTO route_body_areas (id, clinic_id, administration_route_id, body_area_id) VALUES
  ('rba-im-01', 'ana-morong-clinic', 'route-im', 'area-gluteo-d'),
  ('rba-im-02', 'ana-morong-clinic', 'route-im', 'area-gluteo-e'),
  ('rba-im-03', 'ana-morong-clinic', 'route-im', 'area-deltoide-d'),
  ('rba-im-04', 'ana-morong-clinic', 'route-im', 'area-deltoide-e'),
  ('rba-im-05', 'ana-morong-clinic', 'route-im', 'area-coxa-d'),
  ('rba-im-06', 'ana-morong-clinic', 'route-im', 'area-coxa-e');

-- Subcutânea: abdômen, braços, coxas
INSERT OR IGNORE INTO route_body_areas (id, clinic_id, administration_route_id, body_area_id) VALUES
  ('rba-sc-01', 'ana-morong-clinic', 'route-sc', 'area-abdomen'),
  ('rba-sc-02', 'ana-morong-clinic', 'route-sc', 'area-braco-d'),
  ('rba-sc-03', 'ana-morong-clinic', 'route-sc', 'area-braco-e'),
  ('rba-sc-04', 'ana-morong-clinic', 'route-sc', 'area-coxa-d'),
  ('rba-sc-05', 'ana-morong-clinic', 'route-sc', 'area-coxa-e');

-- Categorias
INSERT OR IGNORE INTO inventory_categories (id, clinic_id, name, applies_to, is_active) VALUES
  ('cat-vit',    'ana-morong-clinic', 'Vitaminas e Suplementos',    'medication', 1),
  ('cat-ev',     'ana-morong-clinic', 'Medicamentos EV',            'medication', 1),
  ('cat-im',     'ana-morong-clinic', 'Medicamentos IM',            'medication', 1),
  ('cat-sc',     'ana-morong-clinic', 'Medicamentos SC',            'medication', 1),
  ('cat-ser',    'ana-morong-clinic', 'Seringas',                   'material',   1),
  ('cat-agulha', 'ana-morong-clinic', 'Agulhas',                    'material',   1),
  ('cat-desc',   'ana-morong-clinic', 'Descartáveis',               'material',   1),
  ('cat-equip',  'ana-morong-clinic', 'Equipamentos',               'equipment',  1),
  ('cat-outros', 'ana-morong-clinic', 'Outros',                     'all',        1);

-- Template de evolução padrão
INSERT OR IGNORE INTO evolution_templates (id, clinic_id, name, template_text, is_default, is_active) VALUES
  ('tmpl-01', 'ana-morong-clinic', 'Evolução Padrão',
   'Paciente {{patient_name}} realizou {{protocol_name}} em {{procedure_date}}.

Área registrada: {{body_area}}.

Medicamentos utilizados:
{{medications}}

Materiais utilizados:
{{materials}}

Procedimento registrado {{intercurrence_status}}.

Observações: {{notes}}',
   1, 1);


-- >>> MIGRATION: 003_real_password_hash.sql <<<
-- =============================================================
-- MIGRATION 003 - Hash real da usuaria padrao
-- Senha de desenvolvimento: Ana2026!
-- =============================================================

UPDATE users
SET password_hash = 'pbkdf2_sha256$210000$D1o0rsNGe2aQ/YBYTbztZg==$yG6I9mTfYN2IqJeWGhRlLucJdb/yoqUw8afUG1xjcYU=',
    updated_at = datetime('now')
WHERE id = 'user-ana-01'
  AND password_hash = '$2a$12$devhash.placeholder.for.development.only';


-- >>> MIGRATION: 004_inventory_receipts_labels.sql <<<
-- =============================================================
-- MIGRATION 004 - Entrada de estoque e etiquetas
-- =============================================================

CREATE TABLE IF NOT EXISTS inventory_receipts (
  id                     TEXT PRIMARY KEY,
  clinic_id              TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  receipt_type           TEXT NOT NULL CHECK(receipt_type IN ('manual','xml')),
  supplier_id            TEXT REFERENCES suppliers(id),
  supplier_name_snapshot TEXT,
  invoice_number         TEXT,
  invoice_key            TEXT,
  invoice_xml_path       TEXT,
  entry_date             TEXT NOT NULL DEFAULT (date('now')),
  status                 TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('draft','review','confirmed','cancelled')),
  notes                  TEXT,
  created_by_user_id     TEXT REFERENCES users(id),
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at             TEXT
);

CREATE INDEX IF NOT EXISTS idx_receipts_entry_date ON inventory_receipts(entry_date);
CREATE INDEX IF NOT EXISTS idx_receipts_supplier ON inventory_receipts(supplier_id);

CREATE TABLE IF NOT EXISTS inventory_receipt_items (
  id                            TEXT PRIMARY KEY,
  clinic_id                     TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  receipt_id                    TEXT NOT NULL REFERENCES inventory_receipts(id),
  inventory_item_id             TEXT NOT NULL REFERENCES inventory_items(id),
  raw_product_name              TEXT,
  raw_product_code              TEXT,
  raw_unit                      TEXT,
  raw_quantity                  REAL,
  commercial_quantity           REAL NOT NULL,
  commercial_unit               TEXT NOT NULL,
  content_per_commercial_unit   REAL NOT NULL,
  control_unit                  TEXT NOT NULL,
  total_control_quantity        REAL NOT NULL,
  batch_number                  TEXT,
  expiration_date               TEXT,
  manufacturing_date            TEXT,
  supplier_id                   TEXT REFERENCES suppliers(id),
  unit_cost                     REAL,
  total_cost                    REAL,
  notes                         TEXT,
  created_at                    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                    TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at                    TEXT,
  CHECK(commercial_quantity > 0),
  CHECK(content_per_commercial_unit > 0),
  CHECK(total_control_quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt ON inventory_receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_item ON inventory_receipt_items(inventory_item_id);

CREATE TABLE IF NOT EXISTS label_templates (
  id                   TEXT PRIMARY KEY,
  clinic_id            TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  name                 TEXT NOT NULL,
  description          TEXT,
  label_type           TEXT NOT NULL DEFAULT 'inventory',
  width_mm             REAL NOT NULL,
  height_mm            REAL NOT NULL,
  paper_size           TEXT NOT NULL DEFAULT 'A4',
  columns              INTEGER NOT NULL DEFAULT 1,
  rows                 INTEGER NOT NULL DEFAULT 1,
  gap_x_mm             REAL NOT NULL DEFAULT 0,
  gap_y_mm             REAL NOT NULL DEFAULT 0,
  margin_top_mm        REAL NOT NULL DEFAULT 0,
  margin_left_mm       REAL NOT NULL DEFAULT 0,
  padding_mm           REAL NOT NULL DEFAULT 2,
  show_logo            INTEGER NOT NULL DEFAULT 1,
  show_item_name       INTEGER NOT NULL DEFAULT 1,
  show_batch           INTEGER NOT NULL DEFAULT 1,
  show_expiration      INTEGER NOT NULL DEFAULT 1,
  show_qrcode          INTEGER NOT NULL DEFAULT 1,
  show_barcode         INTEGER NOT NULL DEFAULT 0,
  show_supplier        INTEGER NOT NULL DEFAULT 0,
  template_config_json TEXT,
  is_default           INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at           TEXT
);

CREATE INDEX IF NOT EXISTS idx_label_templates_default ON label_templates(is_default);

CREATE TABLE IF NOT EXISTS label_print_jobs (
  id                 TEXT PRIMARY KEY,
  clinic_id          TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  job_name           TEXT NOT NULL,
  source_type        TEXT NOT NULL,
  source_id          TEXT NOT NULL,
  template_id        TEXT NOT NULL REFERENCES label_templates(id),
  total_labels       INTEGER NOT NULL,
  status             TEXT NOT NULL DEFAULT 'created' CHECK(status IN ('created','previewed','printed','cancelled')),
  created_by_user_id TEXT REFERENCES users(id),
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_label_jobs_source ON label_print_jobs(source_type, source_id);

CREATE TABLE IF NOT EXISTS label_print_items (
  id                  TEXT PRIMARY KEY,
  clinic_id           TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  print_job_id        TEXT NOT NULL REFERENCES label_print_jobs(id),
  inventory_item_id   TEXT NOT NULL REFERENCES inventory_items(id),
  inventory_batch_id  TEXT NOT NULL REFERENCES inventory_batches(id),
  quantity            INTEGER NOT NULL DEFAULT 1,
  qr_payload          TEXT NOT NULL,
  barcode_value       TEXT,
  label_data_snapshot TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_label_items_job ON label_print_items(print_job_id);
CREATE INDEX IF NOT EXISTS idx_label_items_batch ON label_print_items(inventory_batch_id);

INSERT OR IGNORE INTO label_templates (
  id, clinic_id, name, description, label_type, width_mm, height_mm, paper_size,
  columns, rows, gap_x_mm, gap_y_mm, margin_top_mm, margin_left_mm, padding_mm,
  show_logo, show_item_name, show_batch, show_expiration, show_qrcode, show_barcode, show_supplier,
  template_config_json, is_default
) VALUES
  (
    'label-template-pimaco-6080',
    'ana-morong-clinic',
    'Pimaco 6080/6180/6280',
    'Folha A4 com 30 etiquetas, aproximado 25,4 x 66,7 mm.',
    'inventory',
    66.7,
    25.4,
    'A4',
    3,
    10,
    2.5,
    0,
    12.7,
    4.8,
    2,
    1, 1, 1, 1, 1, 0, 0,
    '{"usage":"folha","recommended_for":"itens pequenos e medios"}',
    1
  ),
  (
    'label-template-small-vial',
    'ana-morong-clinic',
    'Pequena para frasco/ampola',
    'Etiqueta interna compacta para frascos, ampolas e embalagens menores.',
    'inventory',
    50,
    30,
    'custom',
    1,
    1,
    0,
    0,
    0,
    0,
    2,
    1, 1, 1, 1, 1, 0, 0,
    '{"usage":"individual","recommended_for":"frascos e ampolas"}',
    0
  );


-- >>> MIGRATION: 005_appointments.sql <<<
-- 005_appointments.sql
-- The appointments table is created by 001_initial.sql. This migration keeps
-- only complementary indexes using the real column names from that schema.

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);


-- >>> MIGRATION: 006_seed_body_areas.sql <<<
-- =============================================================
-- MIGRATION 002 — Seed: Rotas de Administração + Áreas Corporais
-- Sistema: Controle de Estoque — Dra. Ana Morong
-- =============================================================

-- Rotas de Administração (EV, IM, SC)
INSERT OR IGNORE INTO administration_routes (id, clinic_id, name, description, is_active) VALUES
  ('route-ev', 'ana-morong-clinic', 'EV', 'Endovenosa / Intravenosa', 1),
  ('route-im', 'ana-morong-clinic', 'IM', 'Intramuscular', 1),
  ('route-sc', 'ana-morong-clinic', 'SC', 'Subcutânea', 1);

-- Áreas Corporais — EV (8 áreas)
INSERT OR IGNORE INTO body_areas (id, clinic_id, name, slug, svg_region_id, description, is_active) VALUES
  ('ba-ev-mao-dir',      'ana-morong-clinic', 'Mão Direita',              'ev_mao_direita',              'ev-mao-direita',              'Via EV - Mão Direita',              1),
  ('ba-ev-ante-cd',      'ana-morong-clinic', 'Antebraço Costa Direito',  'ev_antebraco_costa_direito',  'ev-antebraco-costa-direito',  'Via EV - Antebraço Costa Direito',  1),
  ('ba-ev-mao-esq',      'ana-morong-clinic', 'Mão Esquerda',             'ev_mao_esquerda',             'ev-mao-esquerda',             'Via EV - Mão Esquerda',             1),
  ('ba-ev-ante-ce',      'ana-morong-clinic', 'Antebraço Costa Esquerdo', 'ev_antebraco_costa_esquerdo', 'ev-antebraco-costa-esquerdo', 'Via EV - Antebraço Costa Esquerdo', 1),
  ('ba-ev-ante-dir',     'ana-morong-clinic', 'Antebraço Direito',        'ev_antebraco_direito',        'ev-antebraco-direito',        'Via EV - Antebraço Direito',        1),
  ('ba-ev-veia-mbd',     'ana-morong-clinic', 'Veia Meio Braço Direito',  'ev_veia_meio_braco_direito',  'ev-veia-meio-braco-direito',  'Via EV - Veia Meio Braço Direito',  1),
  ('ba-ev-ante-esq',     'ana-morong-clinic', 'Antebraço Esquerdo',       'ev_antebraco_esquerdo',       'ev-antebraco-esquerdo',       'Via EV - Antebraço Esquerdo',       1),
  ('ba-ev-veia-mbe',     'ana-morong-clinic', 'Veia Meio Braço Esquerdo', 'ev_veia_meio_braco_esquerdo', 'ev-veia-meio-braco-esquerdo', 'Via EV - Veia Meio Braço Esquerdo', 1);

-- Áreas Corporais — IM (8 áreas)
INSERT OR IGNORE INTO body_areas (id, clinic_id, name, slug, svg_region_id, description, is_active) VALUES
  ('ba-im-ombro-dir',    'ana-morong-clinic', 'Ombro Direito',           'im_ombro_direito',           'im-ombro-direito',           'Via IM - Ombro Direito',           1),
  ('ba-im-ombro-esq',    'ana-morong-clinic', 'Ombro Esquerdo',          'im_ombro_esquerdo',          'im-ombro-esquerdo',          'Via IM - Ombro Esquerdo',          1),
  ('ba-im-gluteo-dir',   'ana-morong-clinic', 'Glúteo Direito',          'im_gluteo_direito',          'im-gluteo-direito',          'Via IM - Glúteo Direito',          1),
  ('ba-im-gluteo-esq',   'ana-morong-clinic', 'Glúteo Esquerdo',         'im_gluteo_esquerdo',         'im-gluteo-esquerdo',         'Via IM - Glúteo Esquerdo',         1),
  ('ba-im-lat-glu-dir',  'ana-morong-clinic', 'Lateral Glúteo Direito',  'im_lateral_gluteo_direito',  'im-lateral-gluteo-direito',  'Via IM - Lateral Glúteo Direito',  1),
  ('ba-im-lat-glu-esq',  'ana-morong-clinic', 'Lateral Glúteo Esquerdo', 'im_lateral_gluteo_esquerdo', 'im-lateral-gluteo-esquerdo', 'Via IM - Lateral Glúteo Esquerdo', 1),
  ('ba-im-coxa-esq',     'ana-morong-clinic', 'Coxa Esquerda',           'im_coxa_esquerda',           'im-coxa-esquerda',           'Via IM - Coxa Esquerda',           1),
  ('ba-im-coxa-dir',     'ana-morong-clinic', 'Coxa Direita',            'im_coxa_direita',            'im-coxa-direita',            'Via IM - Coxa Direita',            1);

-- Áreas Corporais — SC (11 áreas)
INSERT OR IGNORE INTO body_areas (id, clinic_id, name, slug, svg_region_id, description, is_active) VALUES
  ('ba-sc-ccme',  'ana-morong-clinic', 'Campo Coxa Menor Esq.',    'sc_campo_coxa_menor_esquerda', 'sc-campo-coxa-menor-esquerda', 'Via SC - Campo Coxa Menor Esq.', 1),
  ('ba-sc-ccmd',  'ana-morong-clinic', 'Campo Coxa Menor Dir.',    'sc_campo_coxa_menor_direita',  'sc-campo-coxa-menor-direita',  'Via SC - Campo Coxa Menor Dir.', 1),
  ('ba-sc-tmadir','ana-morong-clinic', 'Tríceps Maior Direita',    'sc_triceps_maior_direita',     'sc-triceps-maior-direita',     'Via SC - Tríceps Maior Dir.',    1),
  ('ba-sc-tmaesq','ana-morong-clinic', 'Tríceps Maior Esquerdo',   'sc_triceps_maior_esquerdo',    'sc-triceps-maior-esquerdo',    'Via SC - Tríceps Maior Esq.',    1),
  ('ba-sc-tmendir','ana-morong-clinic','Tríceps Menor Direita',    'sc_triceps_menor_direita',     'sc-triceps-menor-direita',     'Via SC - Tríceps Menor Dir.',    1),
  ('ba-sc-tmenesq','ana-morong-clinic','Tríceps Menor Esquerdo',   'sc_triceps_menor_esquerdo',    'sc-triceps-menor-esquerdo',    'Via SC - Tríceps Menor Esq.',    1),
  ('ba-sc-costa', 'ana-morong-clinic', 'Costas',                   'sc_costa',                     'sc-costa',                     'Via SC - Costas',                1),
  ('ba-sc-coxa-e','ana-morong-clinic', 'Coxa Esquerda SC',         'sc_coxa_esquerda',             'sc-coxa-esquerda',             'Via SC - Coxa Esquerda',         1),
  ('ba-sc-coxa-d','ana-morong-clinic', 'Coxa Direita SC',          'sc_coxa_direita',              'sc-coxa-direita',              'Via SC - Coxa Direita',          1),
  ('ba-sc-barriga','ana-morong-clinic','Barriga / Abdômen',        'sc_barriga',                   'sc-barriga',                   'Via SC - Barriga / Abdômen',     1),
  ('ba-sc-cint-d', 'ana-morong-clinic','Cintura Direita',          'sc_cintura_direita',           'sc-cintura-direita',           'Via SC - Cintura Direita',       1),
  ('ba-sc-cint-e', 'ana-morong-clinic','Cintura Esquerda',         'sc_cintura_esquerda',          'sc-cintura-esquerda',          'Via SC - Cintura Esquerda',      1);

-- Ligações route_body_areas — EV
INSERT OR IGNORE INTO route_body_areas (id, clinic_id, administration_route_id, body_area_id) VALUES
  ('rba-ev-1','ana-morong-clinic','route-ev','ba-ev-mao-dir'),
  ('rba-ev-2','ana-morong-clinic','route-ev','ba-ev-ante-cd'),
  ('rba-ev-3','ana-morong-clinic','route-ev','ba-ev-mao-esq'),
  ('rba-ev-4','ana-morong-clinic','route-ev','ba-ev-ante-ce'),
  ('rba-ev-5','ana-morong-clinic','route-ev','ba-ev-ante-dir'),
  ('rba-ev-6','ana-morong-clinic','route-ev','ba-ev-veia-mbd'),
  ('rba-ev-7','ana-morong-clinic','route-ev','ba-ev-ante-esq'),
  ('rba-ev-8','ana-morong-clinic','route-ev','ba-ev-veia-mbe');

-- Ligações route_body_areas — IM
INSERT OR IGNORE INTO route_body_areas (id, clinic_id, administration_route_id, body_area_id) VALUES
  ('rba-im-1','ana-morong-clinic','route-im','ba-im-ombro-dir'),
  ('rba-im-2','ana-morong-clinic','route-im','ba-im-ombro-esq'),
  ('rba-im-3','ana-morong-clinic','route-im','ba-im-gluteo-dir'),
  ('rba-im-4','ana-morong-clinic','route-im','ba-im-gluteo-esq'),
  ('rba-im-5','ana-morong-clinic','route-im','ba-im-lat-glu-dir'),
  ('rba-im-6','ana-morong-clinic','route-im','ba-im-lat-glu-esq'),
  ('rba-im-7','ana-morong-clinic','route-im','ba-im-coxa-esq'),
  ('rba-im-8','ana-morong-clinic','route-im','ba-im-coxa-dir');

-- Ligações route_body_areas — SC
INSERT OR IGNORE INTO route_body_areas (id, clinic_id, administration_route_id, body_area_id) VALUES
  ('rba-sc-1', 'ana-morong-clinic','route-sc','ba-sc-ccme'),
  ('rba-sc-2', 'ana-morong-clinic','route-sc','ba-sc-ccmd'),
  ('rba-sc-3', 'ana-morong-clinic','route-sc','ba-sc-tmadir'),
  ('rba-sc-4', 'ana-morong-clinic','route-sc','ba-sc-tmaesq'),
  ('rba-sc-5', 'ana-morong-clinic','route-sc','ba-sc-tmendir'),
  ('rba-sc-6', 'ana-morong-clinic','route-sc','ba-sc-tmenesq'),
  ('rba-sc-7', 'ana-morong-clinic','route-sc','ba-sc-costa'),
  ('rba-sc-8', 'ana-morong-clinic','route-sc','ba-sc-coxa-e'),
  ('rba-sc-9', 'ana-morong-clinic','route-sc','ba-sc-coxa-d'),
  ('rba-sc-10','ana-morong-clinic','route-sc','ba-sc-barriga'),
  ('rba-sc-11','ana-morong-clinic','route-sc','ba-sc-cint-d'),
  ('rba-sc-12','ana-morong-clinic','route-sc','ba-sc-cint-e');


-- >>> MIGRATION: 007_dashboard_notifications.sql <<<
-- =============================================================
-- MIGRATION 007 - Dashboard e notificacoes operacionais
-- =============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id             TEXT PRIMARY KEY,
  clinic_id      TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  user_id        TEXT REFERENCES users(id),
  type           TEXT NOT NULL,
  title          TEXT NOT NULL,
  message        TEXT NOT NULL,
  entity_type    TEXT,
  entity_id      TEXT,
  severity       TEXT NOT NULL DEFAULT 'medium' CHECK(severity IN ('critical','high','medium','low','info')),
  status         TEXT NOT NULL DEFAULT 'unread' CHECK(status IN ('unread','read','resolved','dismissed')),
  action_url     TEXT,
  metadata_json  TEXT,
  read_at        TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_active_dedupe
  ON notifications(clinic_id, type, entity_type, entity_id)
  WHERE deleted_at IS NULL AND status IN ('unread','read');

CREATE TABLE IF NOT EXISTS dashboard_preferences (
  id                   TEXT PRIMARY KEY,
  clinic_id            TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  user_id              TEXT REFERENCES users(id),
  default_period       TEXT NOT NULL DEFAULT '30d',
  visible_cards_json   TEXT,
  visible_charts_json  TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(clinic_id, user_id)
);


-- >>> MIGRATION: 008_patient_application_plans.sql <<<
-- 008_patient_application_plans.sql

CREATE TABLE IF NOT EXISTS patient_application_plans (
  id VARCHAR(36) PRIMARY KEY,
  clinic_id VARCHAR(36) NOT NULL,
  patient_id VARCHAR(36) NOT NULL,
  protocol_id VARCHAR(36) NOT NULL,
  route_id VARCHAR(36) NOT NULL,
  appointment_id VARCHAR(36),
  scheduled_at DATETIME,
  status VARCHAR(20) NOT NULL CHECK(status IN ('planned', 'scheduled', 'in_progress', 'finalized', 'cancelled')),
  notes TEXT,
  created_by_user_id VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (protocol_id) REFERENCES protocols(id),
  FOREIGN KEY (route_id) REFERENCES administration_routes(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_patient_application_plans_clinic ON patient_application_plans(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patient_application_plans_patient ON patient_application_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_application_plans_status ON patient_application_plans(status);
CREATE INDEX IF NOT EXISTS idx_patient_application_plans_scheduled ON patient_application_plans(scheduled_at);

ALTER TABLE procedures ADD COLUMN application_plan_id VARCHAR(36);

CREATE INDEX IF NOT EXISTS idx_procedures_application_plan_id ON procedures(application_plan_id);


-- >>> MIGRATION: 009_appscript_integration.sql <<<
-- 009_appscript_integration.sql
-- Local-first Apps Script integration support.

CREATE TABLE IF NOT EXISTS external_sync_queue (
  id              TEXT PRIMARY KEY,
  clinic_id       TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  provider        TEXT NOT NULL,
  action          TEXT NOT NULL,
  entity_type     TEXT,
  entity_id       TEXT,
  request_id      TEXT NOT NULL,
  payload_json    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','synced','failed','cancelled')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  next_attempt_at TEXT,
  last_error      TEXT,
  response_json   TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_external_sync_queue_request
  ON external_sync_queue(provider, request_id);
CREATE INDEX IF NOT EXISTS idx_external_sync_queue_status
  ON external_sync_queue(provider, status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_external_sync_queue_entity
  ON external_sync_queue(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS external_sync_logs (
  id            TEXT PRIMARY KEY,
  clinic_id     TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  provider      TEXT NOT NULL,
  action        TEXT NOT NULL,
  request_id    TEXT,
  entity_type   TEXT,
  entity_id     TEXT,
  status        TEXT NOT NULL,
  response_json TEXT,
  error_message TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_external_sync_logs_created
  ON external_sync_logs(provider, created_at);
CREATE INDEX IF NOT EXISTS idx_external_sync_logs_entity
  ON external_sync_logs(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS checkin_requests (
  id                    TEXT PRIMARY KEY,
  clinic_id             TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  patient_id            TEXT,
  application_plan_id   TEXT,
  procedure_id          TEXT,
  appointment_id        TEXT,
  patient_email         TEXT,
  scheduled_for         TEXT,
  sent_at               TEXT,
  response_received_at  TEXT,
  status                TEXT NOT NULL DEFAULT 'scheduled',
  form_url              TEXT,
  external_response_id  TEXT,
  response_json         TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_checkin_requests_patient
  ON checkin_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_checkin_requests_status
  ON checkin_requests(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_checkin_requests_external_response
  ON checkin_requests(external_response_id);

ALTER TABLE appointments ADD COLUMN google_calendar_event_url TEXT;
ALTER TABLE appointments ADD COLUMN appscript_sync_status TEXT NOT NULL DEFAULT 'not_synced';
ALTER TABLE appointments ADD COLUMN appscript_request_id TEXT;
ALTER TABLE appointments ADD COLUMN appscript_last_error TEXT;
ALTER TABLE appointments ADD COLUMN appscript_last_sync_at TEXT;
ALTER TABLE appointments ADD COLUMN email_sent_at TEXT;
ALTER TABLE appointments ADD COLUMN checkin_scheduled_for TEXT;


-- >>> MIGRATION: 010_patient_report_exports.sql <<<
-- 010_patient_report_exports.sql
-- Controle de relatórios exportados e e-mails disparados aos pacientes.

CREATE TABLE IF NOT EXISTS patient_report_exports (
  id                          TEXT PRIMARY KEY,
  clinic_id                   TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  patient_id                  TEXT NOT NULL,
  report_type                 TEXT NOT NULL, -- ex: 'application_report'
  selected_procedure_ids_json TEXT NOT NULL, -- Array de strings em JSON
  html_body                   TEXT,          -- Pode ser NULL se for só texto ou muito grande
  text_body                   TEXT,
  sent_to_email               TEXT,
  status                      TEXT NOT NULL DEFAULT 'draft', -- draft, generated, pending_send, sent, failed
  appscript_request_id        TEXT,
  appscript_last_error        TEXT,
  created_by_user_id          TEXT,
  sent_at                     TEXT,
  created_at                  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_patient_report_exports_patient
  ON patient_report_exports(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_report_exports_status
  ON patient_report_exports(status);


-- >>> MIGRATION: 011_appointments_application_plan.sql <<<
-- 011_appointments_application_plan.sql
-- Vincula agendamentos diretamente a planos de aplicação

ALTER TABLE appointments ADD COLUMN application_plan_id VARCHAR(36);

CREATE INDEX IF NOT EXISTS idx_appointments_application_plan_id ON appointments(application_plan_id);


-- >>> MIGRATION: 012_body_areas_enhancement.sql <<<
-- 010_body_areas_enhancement.sql

-- 1. Enhancing body_areas table
ALTER TABLE body_areas ADD COLUMN display_name TEXT;
ALTER TABLE body_areas ADD COLUMN route_code TEXT;
ALTER TABLE body_areas ADD COLUMN anatomical_region TEXT;
ALTER TABLE body_areas ADD COLUMN side TEXT CHECK(side IN ('right', 'left', 'central', 'bilateral'));
ALTER TABLE body_areas ADD COLUMN view_position TEXT CHECK(view_position IN ('front', 'back', 'side'));
ALTER TABLE body_areas ADD COLUMN clinical_notes TEXT;

-- Seed some extra data or update existing rows if needed
UPDATE body_areas SET display_name = name WHERE display_name IS NULL;

-- 2. Enhancing stock_movements check constraint for corrections
-- SQLite requires table recreation to change a CHECK constraint


CREATE TABLE IF NOT EXISTS stock_movements_new (
  id                 TEXT PRIMARY KEY,
  clinic_id          TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  inventory_item_id  TEXT NOT NULL REFERENCES inventory_items(id),
  inventory_batch_id TEXT REFERENCES inventory_batches(id),
  movement_type      TEXT NOT NULL CHECK(movement_type IN ('entry','exit','automatic_exit','adjustment','loss','expired','correction','correction_in','correction_out')),
  quantity           REAL NOT NULL,
  unit               TEXT NOT NULL,
  reason             TEXT,
  patient_id         TEXT REFERENCES patients(id),
  protocol_id        TEXT,
  procedure_id       TEXT,
  user_id            TEXT REFERENCES users(id),
  movement_date      TEXT NOT NULL DEFAULT (datetime('now')),
  notes              TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  correction_group_id TEXT,
  related_procedure_item_id TEXT
);

INSERT INTO stock_movements_new (
  id, clinic_id, inventory_item_id, inventory_batch_id, movement_type, quantity, unit, reason, patient_id, protocol_id, procedure_id, user_id, movement_date, notes, created_at
)
SELECT 
  id, clinic_id, inventory_item_id, inventory_batch_id, movement_type, quantity, unit, reason, patient_id, protocol_id, procedure_id, user_id, movement_date, notes, created_at
FROM stock_movements;

DROP TABLE stock_movements;
ALTER TABLE stock_movements_new RENAME TO stock_movements;

CREATE INDEX IF NOT EXISTS idx_movements_item ON stock_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_movements_patient ON stock_movements(patient_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON stock_movements(movement_date);



-- 3. Enhance procedure_items_used
-- Add fields to track corrections
ALTER TABLE procedure_items_used ADD COLUMN is_corrected INTEGER NOT NULL DEFAULT 0;
ALTER TABLE procedure_items_used ADD COLUMN correction_group_id TEXT;


-- >>> MIGRATION: 013_body_areas_clinical_nomenclature.sql <<<
-- 013_body_areas_clinical_nomenclature.sql
-- =============================================================
-- MIGRATION 013 - Body areas clinical nomenclature compatibility marker
-- =============================================================
--
-- Older installed databases may already have the body_areas compatibility
-- columns from the runtime schema pass while version 013 is still not recorded
-- in _sqlx_migrations. The original migration rebuilt the body_areas table and
-- could rewrite clinical data unnecessarily in that state.
--
-- Structural compatibility is guaranteed idempotently in sqlite.ts. Keep this
-- migration as a safe marker so migration history can advance without dropping
-- or recreating user data tables.

SELECT 1;


-- >>> MIGRATION: 014_import_export_tables.sql <<<
-- Migration 014: Import, Export, and Patient Merge tables

CREATE TABLE IF NOT EXISTS data_import_jobs (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL,
    import_type TEXT NOT NULL,
    file_name TEXT,
    file_hash TEXT,
    status TEXT DEFAULT 'draft',
    total_rows INTEGER DEFAULT 0,
    valid_rows INTEGER DEFAULT 0,
    invalid_rows INTEGER DEFAULT 0,
    duplicated_rows INTEGER DEFAULT 0,
    created_count INTEGER DEFAULT 0,
    updated_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    merged_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    mapping_json TEXT,
    summary_json TEXT,
    created_by_user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME
);

CREATE TABLE IF NOT EXISTS data_import_rows (
    id TEXT PRIMARY KEY,
    import_job_id TEXT NOT NULL,
    row_number INTEGER NOT NULL,
    raw_json TEXT,
    mapped_json TEXT,
    validation_errors_json TEXT,
    duplicate_candidates_json TEXT,
    selected_action TEXT,
    status TEXT,
    target_entity_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(import_job_id) REFERENCES data_import_jobs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS patient_merge_history (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL,
    primary_patient_id TEXT NOT NULL,
    merged_patient_id TEXT NOT NULL,
    merge_reason TEXT,
    merged_fields_json TEXT,
    conflicts_json TEXT,
    created_by_user_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(primary_patient_id) REFERENCES patients(id),
    FOREIGN KEY(merged_patient_id) REFERENCES patients(id)
);

-- Patient merge columns are guaranteed idempotently in sqlite.ts.
-- Avoid ALTER TABLE ADD COLUMN here because some installed databases received
-- these columns through runtime compatibility before migration 014 was recorded.


-- >>> MIGRATION: 015_inventory_refactoring.sql <<<
-- =============================================================
-- MIGRATION 015 - Inventory refactoring compatibility marker
-- =============================================================
--
-- Inventory specialization columns are guaranteed idempotently in sqlite.ts.
-- Installed databases may already have these columns even when migration 015 is
-- not recorded in _sqlx_migrations, so this migration must not repeat ALTER
-- TABLE ADD COLUMN statements.

SELECT 1;


-- >>> MIGRATION: 016_procedure_corrections.sql <<<
-- =============================================================
-- MIGRATION 016 - Procedure corrections compatibility marker
-- =============================================================
--
-- Procedure correction columns are guaranteed idempotently in sqlite.ts.
-- This marker keeps the migration version monotonic without repeating unsafe
-- ALTER TABLE ADD COLUMN statements on installed databases.

SELECT 1;


-- >>> MIGRATION: 017_inventory_new_columns.sql <<<
-- =============================================================
-- MIGRATION 017 - Inventory compatibility marker
-- =============================================================
--
-- The inventory specialization columns are created by migration 015.
-- This version remains registered so existing migration histories stay
-- monotonic, but it must not repeat ALTER TABLE ADD COLUMN statements.
-- Runtime compatibility for lagging databases is handled in sqlite.ts.

SELECT 1;


-- >>> MIGRATION: 018_suppliers_expansion.sql <<<
-- =============================================================
-- MIGRATION 018 - Suppliers expansion compatibility marker
-- =============================================================
--
-- Supplier expansion columns are guaranteed idempotently in sqlite.ts.
-- This marker prevents failures on databases that already received the columns
-- through the runtime compatibility pass.

SELECT 1;


-- >>> MIGRATION: 019_inventory_locations.sql <<<
-- =============================================================
-- MIGRATION 019 - Inventory locations compatibility marker
-- =============================================================
--
-- Inventory location tables, default location, location stock backfill and
-- location_id columns are guaranteed idempotently in sqlite.ts. The original
-- migration inserted rows without clinic_id into a NOT NULL column, so the
-- operational work lives in the runtime compatibility pass.

SELECT 1;


-- >>> MIGRATION: 020_label_template_calibration.sql <<<
-- =============================================================
-- MIGRATION 020 - Label template calibration
-- =============================================================
--
-- The calibration_x/calibration_y columns are guaranteed idempotently in
-- sqlite.ts. This migration is intentionally free of ALTER TABLE ADD COLUMN
-- statements so databases that already received the columns through the
-- runtime compatibility pass do not fail when version 20 is registered.

UPDATE label_templates
SET paper_size = 'Letter',
    margin_left_mm = 4.0,
    gap_x_mm = 3.9,
    margin_top_mm = 12.7,
    gap_y_mm = 0,
    description = 'Folha Carta com 30 etiquetas, aproximado 25,4 x 66,7 mm.'
WHERE id = 'label-template-pimaco-6080';


-- >>> MIGRATION: 021_scanner_settings.sql <<<
-- Migration 021: Campos de configuração do Leitor de Câmera
-- Adiciona as preferências do scanner à tabela de settings existente.
-- Como settings usa key/value, não há alteração estrutural na tabela —
-- apenas inserimos valores padrão seguros via INSERT OR IGNORE.

INSERT OR IGNORE INTO settings (id, clinic_id, key, value, updated_at)
VALUES
  (lower(hex(randomblob(16))), 'ana-morong-clinic', 'scanner_enabled',              'true', datetime('now')),
  (lower(hex(randomblob(16))), 'ana-morong-clinic', 'scanner_mode',                 'qr',   datetime('now')),
  (lower(hex(randomblob(16))), 'ana-morong-clinic', 'scanner_preferred_camera_id',  '',     datetime('now'));


-- >>> MIGRATION: 022_patients_document.sql <<<
-- =============================================================
-- MIGRATION 022 - Patients document compatibility marker
-- =============================================================
--
-- The patients.document column is guaranteed idempotently by the SQLite
-- compatibility pass before application repositories can read patients. Keep
-- this migration free of ALTER TABLE ADD COLUMN so databases that already
-- received the column do not fail when version 022 is registered.

SELECT 1;


-- >>> MIGRATION: 023_database_preflight_guard.sql <<<
-- =============================================================
-- MIGRATION 023 - Database preflight guard marker
-- =============================================================
--
-- Runtime database hardening now happens before Database.load through the
-- Tauri prepare_database_for_open command. This marker keeps migration history
-- monotonic without rewriting existing clinical or inventory data.

SELECT 1;


-- >>> MIGRATION: 024_financial_module.sql <<<
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


-- >>> MIGRATION: 025_procedure_applications.sql <<<
-- Migration 025: Procedure Applications
-- Suporte a múltiplas aplicações/protocolos por sessão clínica

-- Tabela de aplicações individuais dentro de uma sessão clínica
-- Cada aplicação representa: 1 protocolo (opcional) + 1 área corporal + N itens
CREATE TABLE IF NOT EXISTS procedure_applications (
  id            TEXT PRIMARY KEY,
  clinic_id     TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  procedure_id  TEXT NOT NULL REFERENCES procedures(id),
  protocol_id   TEXT REFERENCES protocols(id),
  body_area_id  TEXT REFERENCES body_areas(id),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_proc_apps_procedure ON procedure_applications(procedure_id);
CREATE INDEX IF NOT EXISTS idx_proc_apps_protocol  ON procedure_applications(protocol_id);


-- >>> MIGRATION: 026_procedure_items_application_fk.sql <<<
-- Migration 026: Adicionar colunas de integração para procedure_applications
-- Corrige o schema para suportar múltiplas aplicações por sessão clínica.
--
-- A migration 025 criou a tabela procedure_applications mas não alterou
-- procedure_items_used para referenciar uma aplicação específica.
-- Esta migration corrige isso de forma segura com colunas NULLABLE.

-- 1. Adicionar procedure_application_id em procedure_items_used
--    (NULL para registros legados, preenchido para novos registros)
ALTER TABLE procedure_items_used
  ADD COLUMN procedure_application_id TEXT REFERENCES procedure_applications(id);

-- 2. Adicionar colunas de correção que o repositório usa mas nunca foram adicionadas ao schema
ALTER TABLE procedure_items_used
  ADD COLUMN is_corrected INTEGER NOT NULL DEFAULT 0;

ALTER TABLE procedure_items_used
  ADD COLUMN corrected_at TEXT;

ALTER TABLE procedure_items_used
  ADD COLUMN correction_group_id TEXT;

-- 3. Índice para acelerar buscas por aplicação
CREATE INDEX IF NOT EXISTS idx_proc_items_application
  ON procedure_items_used(procedure_application_id);


-- >>> MIGRATION: 027_financial_module.sql <<<
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


-- >>> MIGRATION: 028_financial_loss_category.sql <<<
-- =============================================================
-- MIGRATION 028 — Categoria de perdas de estoque no financeiro
-- =============================================================

INSERT OR IGNORE INTO financial_categories (id, clinic_id, name, type) VALUES
  ('fin-cat-exp-losses', 'ana-morong-clinic', 'Perdas de estoque', 'expense');

