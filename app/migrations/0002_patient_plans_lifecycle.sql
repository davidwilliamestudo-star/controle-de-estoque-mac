-- =============================================================
-- MIGRATION 029 - Ciclo de vida de planos (Saude 360), follow-up
-- comercial, pausas e vinculo das aplicacoes ao plano.
-- Status de renovacao/vencido/esgotado/pausado sao DERIVADOS na leitura
-- (nao gravados). Contagem de sessoes usadas tambem e calculada.
-- =============================================================

CREATE TABLE IF NOT EXISTS patient_plans (
  id                        TEXT PRIMARY KEY,
  clinic_id                 TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  patient_id                TEXT NOT NULL REFERENCES patients(id),
  plan_key                  TEXT NOT NULL,
  plan_name                 TEXT NOT NULL,
  duration_months           INTEGER NOT NULL DEFAULT 6,
  status                    TEXT NOT NULL DEFAULT 'proposed'
                            CHECK(status IN ('draft','proposed','signed_pending_payment','active','completed','renewed','lost','cancelled')),
  start_date                TEXT,
  base_end_date             TEXT,
  end_date                  TEXT,
  activated_at              TEXT,
  closed_at                 TEXT,
  lost_at                   TEXT,
  lost_reason               TEXT,
  lead_source               TEXT,
  proposal_valid_until      TEXT,
  total_value               REAL NOT NULL DEFAULT 0,
  payment_modality          TEXT,
  payment_status            TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending','partial','paid')),
  payment_receivable_id     TEXT REFERENCES financial_receivables(id),
  included_procedures_total INTEGER NOT NULL DEFAULT 0,
  allows_discounted_extras  INTEGER NOT NULL DEFAULT 1,
  extra_discount_percent    REAL NOT NULL DEFAULT 0,
  document_id               TEXT,
  parent_plan_id            TEXT REFERENCES patient_plans(id),
  next_followup_at          TEXT,
  brevo_contact_id          TEXT,
  brevo_deal_id             TEXT,
  brevo_sync_status         TEXT NOT NULL DEFAULT 'pending' CHECK(brevo_sync_status IN ('pending','synced','failed','disabled')),
  notes                     TEXT,
  created_by_user_id        TEXT,
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at                TEXT
);

CREATE INDEX IF NOT EXISTS idx_patient_plans_patient ON patient_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_plans_status ON patient_plans(status);
CREATE INDEX IF NOT EXISTS idx_patient_plans_end_date ON patient_plans(end_date);
CREATE INDEX IF NOT EXISTS idx_patient_plans_next_followup ON patient_plans(next_followup_at);
CREATE INDEX IF NOT EXISTS idx_patient_plans_document ON patient_plans(document_id);

-- No maximo 1 plano ativo por paciente
CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_plans_one_active
  ON patient_plans(patient_id) WHERE status = 'active' AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS patient_plan_followups (
  id                 TEXT PRIMARY KEY,
  clinic_id          TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  patient_plan_id    TEXT NOT NULL REFERENCES patient_plans(id),
  kind               TEXT NOT NULL DEFAULT 'closing' CHECK(kind IN ('closing','renewal','reactivation')),
  channel            TEXT NOT NULL DEFAULT 'whatsapp' CHECK(channel IN ('whatsapp','phone','in_person','email')),
  outcome            TEXT NOT NULL DEFAULT 'negotiating'
                     CHECK(outcome IN ('no_answer','callback_requested','negotiating','won','lost')),
  lost_reason        TEXT,
  notes              TEXT,
  contacted_at       TEXT,
  next_contact_at    TEXT,
  created_by_user_id TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at         TEXT
);

CREATE INDEX IF NOT EXISTS idx_plan_followups_plan ON patient_plan_followups(patient_plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_followups_next ON patient_plan_followups(next_contact_at);

-- Pausas: cada dia pausado prorroga o fim efetivo do plano
CREATE TABLE IF NOT EXISTS patient_plan_pauses (
  id                 TEXT PRIMARY KEY,
  clinic_id          TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  patient_plan_id    TEXT NOT NULL REFERENCES patient_plans(id),
  paused_from        TEXT NOT NULL,
  paused_to          TEXT,
  reason             TEXT,
  created_by_user_id TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at         TEXT
);

CREATE INDEX IF NOT EXISTS idx_plan_pauses_plan ON patient_plan_pauses(patient_plan_id);

-- Vinculo das aplicacoes ao plano (NULL = aplicacao avulsa)
ALTER TABLE procedures ADD COLUMN patient_plan_id TEXT;
ALTER TABLE procedures ADD COLUMN plan_charge_mode TEXT;
ALTER TABLE patient_application_plans ADD COLUMN patient_plan_id TEXT;

CREATE INDEX IF NOT EXISTS idx_procedures_patient_plan ON procedures(patient_plan_id);

-- Consentimento para CRM/e-mail (LGPD)
ALTER TABLE patients ADD COLUMN crm_consent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE patients ADD COLUMN crm_consent_at TEXT;

-- Configuracoes padrao do funil
INSERT OR IGNORE INTO settings (id, clinic_id, key, value) VALUES
  ('set-followup_first_days', 'ana-morong-clinic', 'followup_first_days', '3'),
  ('set-followup_reactivation_days', 'ana-morong-clinic', 'followup_reactivation_days', '60'),
  ('set-renewal_window_days', 'ana-morong-clinic', 'renewal_window_days', '14');
