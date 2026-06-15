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
