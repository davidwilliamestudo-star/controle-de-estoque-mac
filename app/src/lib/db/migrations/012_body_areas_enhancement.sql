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
PRAGMA foreign_keys=off;

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

PRAGMA foreign_keys=on;

-- 3. Enhance procedure_items_used
-- Add fields to track corrections
ALTER TABLE procedure_items_used ADD COLUMN is_corrected INTEGER NOT NULL DEFAULT 0;
ALTER TABLE procedure_items_used ADD COLUMN correction_group_id TEXT;

