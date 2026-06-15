-- 011_appointments_application_plan.sql
-- Vincula agendamentos diretamente a planos de aplicação

ALTER TABLE appointments ADD COLUMN application_plan_id VARCHAR(36);

CREATE INDEX IF NOT EXISTS idx_appointments_application_plan_id ON appointments(application_plan_id);
