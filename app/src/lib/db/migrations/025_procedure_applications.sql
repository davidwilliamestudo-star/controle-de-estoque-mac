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
