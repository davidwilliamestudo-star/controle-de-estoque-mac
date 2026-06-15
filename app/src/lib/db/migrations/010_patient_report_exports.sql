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
