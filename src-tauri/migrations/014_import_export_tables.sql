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

-- Adicionando colunas de merge na tabela de pacientes
ALTER TABLE patients ADD COLUMN merged_into_patient_id TEXT REFERENCES patients(id);
ALTER TABLE patients ADD COLUMN merged_at DATETIME;
ALTER TABLE patients ADD COLUMN merged_by_user_id TEXT;
ALTER TABLE patients ADD COLUMN merge_status TEXT DEFAULT 'active';
