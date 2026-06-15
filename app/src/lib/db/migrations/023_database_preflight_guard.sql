-- =============================================================
-- MIGRATION 023 - Database preflight guard marker
-- =============================================================
--
-- Runtime database hardening now happens before Database.load through the
-- Tauri prepare_database_for_open command. This marker keeps migration history
-- monotonic without rewriting existing clinical or inventory data.

SELECT 1;
