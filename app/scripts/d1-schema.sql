-- ================================================================
-- SCHEMA DEFINITIVO CLOUDFLARE D1 (DRA. ANA MORONG)
-- Estrutura completa: Tabelas Base + Financeiro + Assinatura Web
-- ================================================================

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
, google_calendar_event_url TEXT, appscript_sync_status TEXT NOT NULL DEFAULT 'not_synced', appscript_request_id TEXT, appscript_last_error TEXT, appscript_last_sync_at TEXT, email_sent_at TEXT, checkin_scheduled_for TEXT, application_plan_id VARCHAR(36));
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
, display_name TEXT, route_code TEXT, anatomical_region TEXT, side TEXT CHECK(side IN ('right', 'left', 'central', 'bilateral')), view_position TEXT CHECK(view_position IN ('front', 'back', 'side')), clinical_notes TEXT, technical_name TEXT, canonical_slug TEXT);
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
, commercial_name TEXT, active_principle TEXT, concentration TEXT, presentation TEXT, pharmaceutical_form TEXT, clinical_control_unit TEXT, unit_converter REAL, material_type TEXT, usage_in_protocol INTEGER DEFAULT 0, equipment_patrimony TEXT, equipment_serial TEXT, equipment_brand TEXT, equipment_model TEXT, equipment_acquisition_date TEXT, equipment_next_maintenance TEXT, equipment_location TEXT, equipment_maintenance_status TEXT DEFAULT 'ativo');
CREATE TABLE IF NOT EXISTS inventory_location_stocks (
              id TEXT PRIMARY KEY,
              clinic_id TEXT NOT NULL DEFAULT 'ana-morong-clinic',
              location_id TEXT NOT NULL,
              inventory_item_id TEXT NOT NULL,
              inventory_batch_id TEXT,
              quantity REAL NOT NULL DEFAULT 0,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(location_id, inventory_item_id, inventory_batch_id)
            );
CREATE TABLE IF NOT EXISTS inventory_locations (
              id TEXT PRIMARY KEY,
              clinic_id TEXT NOT NULL DEFAULT 'ana-morong-clinic',
              name TEXT NOT NULL,
              description TEXT,
              is_default INTEGER DEFAULT 0,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
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
, location_id TEXT);
CREATE TABLE IF NOT EXISTS inventory_transfers (
              id TEXT PRIMARY KEY,
              clinic_id TEXT NOT NULL DEFAULT 'ana-morong-clinic',
              inventory_item_id TEXT NOT NULL,
              inventory_batch_id TEXT,
              from_location_id TEXT NOT NULL,
              to_location_id TEXT NOT NULL,
              quantity REAL NOT NULL,
              transfer_date TEXT DEFAULT CURRENT_TIMESTAMP,
              user_id TEXT,
              notes TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
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
, calibration_x REAL NOT NULL DEFAULT 0, calibration_y REAL NOT NULL DEFAULT 0);
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
, merged_into_patient_id TEXT REFERENCES patients(id), merged_at DATETIME, merged_by_user_id TEXT, merge_status TEXT DEFAULT 'active');
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
, is_corrected INTEGER NOT NULL DEFAULT 0, correction_group_id TEXT, corrected_at TEXT);
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
, application_plan_id VARCHAR(36), is_corrected INTEGER NOT NULL DEFAULT 0, corrected_at TEXT, correction_reason TEXT);
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
CREATE TABLE IF NOT EXISTS route_body_areas (
  id                      TEXT PRIMARY KEY,
  clinic_id               TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  administration_route_id TEXT NOT NULL REFERENCES administration_routes(id),
  body_area_id            TEXT NOT NULL REFERENCES body_areas(id),
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(administration_route_id, body_area_id)
);
CREATE TABLE IF NOT EXISTS settings (
  id         TEXT PRIMARY KEY,
  clinic_id  TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  key        TEXT NOT NULL,
  value      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(clinic_id, key)
);
CREATE TABLE IF NOT EXISTS "stock_movements" (
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
, location_id TEXT);
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
, contact_name TEXT, address TEXT);
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
CREATE INDEX IF NOT EXISTS idx_appointments_application_plan_id ON appointments(application_plan_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiration ON inventory_batches(expiration_date);
CREATE INDEX IF NOT EXISTS idx_batches_item ON inventory_batches(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_checkin_requests_external_response
  ON checkin_requests(external_response_id);
CREATE INDEX IF NOT EXISTS idx_checkin_requests_patient
  ON checkin_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_checkin_requests_status
  ON checkin_requests(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_external_sync_logs_created
  ON external_sync_logs(provider, created_at);
CREATE INDEX IF NOT EXISTS idx_external_sync_logs_entity
  ON external_sync_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_external_sync_queue_entity
  ON external_sync_queue(entity_type, entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_external_sync_queue_request
  ON external_sync_queue(provider, request_id);
CREATE INDEX IF NOT EXISTS idx_external_sync_queue_status
  ON external_sync_queue(provider, status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON inventory_items(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_items_type ON inventory_items(item_type);
CREATE INDEX IF NOT EXISTS idx_label_items_batch ON label_print_items(inventory_batch_id);
CREATE INDEX IF NOT EXISTS idx_label_items_job ON label_print_items(print_job_id);
CREATE INDEX IF NOT EXISTS idx_label_jobs_source ON label_print_jobs(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_label_templates_default ON label_templates(is_default);
CREATE INDEX IF NOT EXISTS idx_movements_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_movements_item ON stock_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_movements_patient ON stock_movements(patient_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_active_dedupe
  ON notifications(clinic_id, type, entity_type, entity_id)
  WHERE deleted_at IS NULL AND status IN ('unread','read');
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_patient_application_plans_clinic ON patient_application_plans(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patient_application_plans_patient ON patient_application_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_application_plans_scheduled ON patient_application_plans(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_patient_application_plans_status ON patient_application_plans(status);
CREATE INDEX IF NOT EXISTS idx_patient_report_exports_patient
  ON patient_report_exports(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_report_exports_status
  ON patient_report_exports(status);
CREATE INDEX IF NOT EXISTS idx_patients_active ON patients(is_active);
CREATE INDEX IF NOT EXISTS idx_patients_clinic ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name);
CREATE INDEX IF NOT EXISTS idx_proc_items_item ON procedure_items_used(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_proc_items_procedure ON procedure_items_used(procedure_id);
CREATE INDEX IF NOT EXISTS idx_procedures_application_plan_id ON procedures(application_plan_id);
CREATE INDEX IF NOT EXISTS idx_procedures_date ON procedures(performed_at);
CREATE INDEX IF NOT EXISTS idx_procedures_patient ON procedures(patient_id);
CREATE INDEX IF NOT EXISTS idx_procedures_status ON procedures(status);
CREATE INDEX IF NOT EXISTS idx_receipt_items_item ON inventory_receipt_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt ON inventory_receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipts_entry_date ON inventory_receipts(entry_date);
CREATE INDEX IF NOT EXISTS idx_receipts_supplier ON inventory_receipts(supplier_id);

-- >>> MIGRATIONS FINANCEIRO & PROCEDIMENTOS ADICIONAIS <<<

-- >>> 024_financial_module.sql <<<
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


-- >>> 025_procedure_applications.sql <<<
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


-- >>> 026_procedure_items_application_fk.sql <<<
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






-- 3. Índice para acelerar buscas por aplicação
CREATE INDEX IF NOT EXISTS idx_proc_items_application
  ON procedure_items_used(procedure_application_id);


-- >>> 027_financial_module.sql <<<
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


-- >>> 028_financial_loss_category.sql <<<
-- =============================================================
-- MIGRATION 028 — Categoria de perdas de estoque no financeiro
-- =============================================================

INSERT OR IGNORE INTO financial_categories (id, clinic_id, name, type) VALUES
  ('fin-cat-exp-losses', 'ana-morong-clinic', 'Perdas de estoque', 'expense');


-- >>> 0001_create_web_signatures_schema.sql <<<
-- ============================================================================
-- MIGRATION D1: SISTEMA DE ASSINATURA ELETRÔNICA WEB-FIRST (DRA. ANA MORONG)
-- ============================================================================


-- 1. Tabela Principal de Documentos
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY NOT NULL,                       -- UUID v4 do documento
    external_provider_id TEXT UNIQUE,                   -- Token do documento no ZapSign (se usar API externa)
    verification_code TEXT NOT NULL UNIQUE,             -- Código público para QR Code (ex: ANA-8F2B-2026)
    patient_id TEXT NOT NULL,                           -- ID do paciente no sistema
    patient_name TEXT NOT NULL,
    patient_cpf TEXT NOT NULL,                          -- CPF apenas números ou formatado
    patient_email TEXT,
    patient_phone TEXT,
    title TEXT NOT NULL,                                -- Ex: "TCLE - Toxina Botulínica e Preenchimento"
    category TEXT NOT NULL DEFAULT 'TCLE',              -- 'TCLE' | 'CONTRATO' | 'PLANO_TRATAMENTO' | 'RECEITUARIO'
    signing_mode TEXT NOT NULL DEFAULT 'hybrid',        -- 'in_person' | 'remote' | 'hybrid'
    engine_provider TEXT NOT NULL DEFAULT 'native',     -- 'native' | 'zapsign'
    status TEXT NOT NULL DEFAULT 'draft',               -- 'draft' | 'pending' | 'partially_signed' | 'completed' | 'rejected' | 'expired'
    original_pdf_url TEXT,                              -- URL no R2/Storage ou Data URI do PDF original
    original_pdf_sha256 TEXT NOT NULL,                  -- Hash SHA-256 original (integridade antes de assinar)
    signed_pdf_url TEXT,                                -- URL temporária/R2 do PDF final com manifesto
    signed_pdf_sha256 TEXT,                             -- Hash SHA-256 final após selagem PAdES/Manifesto
    drive_file_id TEXT,                                 -- ID do arquivo salvo no Google Drive
    drive_file_url TEXT,                                -- URL permanente de visualização no Google Drive
    drive_folder_url TEXT,                              -- URL da pasta do paciente no Google Drive
    gas_sync_status TEXT NOT NULL DEFAULT 'pending',    -- 'pending' | 'synced' | 'failed'
    created_by_user_id TEXT,
    expires_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_documents_patient_cpf ON documents(patient_cpf);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_external_id ON documents(external_provider_id);
CREATE INDEX IF NOT EXISTS idx_documents_verification_code ON documents(verification_code);

-- 2. Tabela de Signatários do Documento
CREATE TABLE IF NOT EXISTS document_signers (
    id TEXT PRIMARY KEY NOT NULL,                       -- UUID v4 do signatário
    document_id TEXT NOT NULL,
    external_signer_token TEXT UNIQUE,                  -- Token do signatário no ZapSign (se aplicável)
    remote_access_token TEXT NOT NULL UNIQUE,           -- Token seguro para rota web: /assinar/:token
    role TEXT NOT NULL,                                 -- 'DRA_ANA' | 'PACIENTE' | 'TESTEMUNHA' | 'RESPONSAVEL_LEGAL'
    signing_order INTEGER NOT NULL DEFAULT 1,
    full_name TEXT NOT NULL,
    cpf TEXT NOT NULL,
    email TEXT,
    phone_whatsapp TEXT,
    council_id TEXT,                                    -- Ex: CRM/CRO/CRBM da Dra. Ana
    auth_type TEXT NOT NULL DEFAULT 'canvas_advanced',  -- 'canvas_advanced' | 'icp_brasil_a1' | 'icp_brasil_cloud' | 'otp_whatsapp'
    legal_standard TEXT NOT NULL DEFAULT 'ADVANCED',    -- 'ADVANCED' (Lei 14.063) | 'QUALIFIED_ICP' (MP 2.200-2)
    status TEXT NOT NULL DEFAULT 'pending',             -- 'pending' | 'viewed' | 'signed' | 'rejected'
    rejection_reason TEXT,
    signature_png_base64 TEXT,                          -- Rubrica/assinatura transparente coletada no Canvas
    selfie_photo_base64 TEXT,                           -- Foto de biometria facial no ato da assinatura
    icp_subject_cn TEXT,                                -- Nome no Certificado Digital ICP-Brasil
    icp_issuer_ca TEXT,                                 -- Autoridade Certificadora ICP-Brasil
    icp_serial_number TEXT,                             -- Número de série do Certificado ICP-Brasil
    signer_ip TEXT,
    signer_user_agent TEXT,
    signer_lat REAL,
    signer_lng REAL,
    signed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_signers_document_id ON document_signers(document_id);
CREATE INDEX IF NOT EXISTS idx_signers_remote_token ON document_signers(remote_access_token);

-- 3. Tabela de Campos Posicionados no PDF (Coordenadas Percentuais 0 a 100%)
CREATE TABLE IF NOT EXISTS signature_fields (
    id TEXT PRIMARY KEY NOT NULL,                       -- UUID v4 do campo
    document_id TEXT NOT NULL,
    signer_id TEXT NOT NULL,
    field_type TEXT NOT NULL DEFAULT 'signature',       -- 'signature' | 'initials' | 'date_stamp' | 'icp_seal'
    page INTEGER NOT NULL,                              -- Página do PDF (1-based: 1, 2, 3...)
    x_percent REAL NOT NULL,                            -- Posição horizontal (0.00 a 100.00%)
    y_percent REAL NOT NULL,                            -- Posição vertical a partir do topo (0.00 a 100.00%)
    width_percent REAL NOT NULL DEFAULT 26.00,          -- Largura relativa à página (0.00 a 100.00%)
    height_percent REAL NOT NULL DEFAULT 8.50,          -- Altura relativa à página (0.00 a 100.00%)
    required INTEGER NOT NULL DEFAULT 1,                -- 1 = Obrigatório, 0 = Opcional
    stamped_at TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (signer_id) REFERENCES document_signers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_signature_fields_document ON signature_fields(document_id);

-- 4. Tabela de Trilha de Auditoria Inviolável (Audit Trail / Dossiê Jurídico)
CREATE TABLE IF NOT EXISTS signature_audit_trails (
    id TEXT PRIMARY KEY NOT NULL,                       -- UUID v4 do evento de auditoria
    document_id TEXT NOT NULL,
    signer_id TEXT,                                     -- NULL para eventos sistêmicos
    event_name TEXT NOT NULL,                           -- 'document.created' | 'document.viewed' | 'document.signed' | 'document.rejected' | 'document.completed' | 'drive.archived'
    event_description TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_cpf TEXT,
    ip_address TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    geolocation_json TEXT,                              -- Ex: {"lat":-23.5505,"lng":-46.6333,"accuracy":12}
    pdf_sha256_snapshot TEXT NOT NULL,                  -- Hash SHA-256 do PDF no instante do evento
    previous_trail_hash TEXT NOT NULL,                  -- Hash do registro anterior (cadeia imutável)
    current_trail_hash TEXT NOT NULL,                   -- SHA-256(id + document_id + event_name + pdf_sha256_snapshot + previous_trail_hash + occurred_at_utc)
    occurred_at_utc TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    occurred_at_brt TEXT NOT NULL,                      -- Data/Hora Oficial de Brasília (UTC-3)
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_trails_document ON signature_audit_trails(document_id);

