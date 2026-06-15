-- =============================================================
-- MIGRATION 022 - Patients document compatibility marker
-- =============================================================
--
-- The patients.document column is guaranteed idempotently by the SQLite
-- compatibility pass before application repositories can read patients. Keep
-- this migration free of ALTER TABLE ADD COLUMN so databases that already
-- received the column do not fail when version 022 is registered.

SELECT 1;
