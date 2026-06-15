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
