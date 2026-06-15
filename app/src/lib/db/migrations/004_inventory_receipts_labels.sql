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

