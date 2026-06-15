-- =============================================================
-- MIGRATION 016 - Procedure corrections compatibility marker
-- =============================================================
--
-- Procedure correction columns are guaranteed idempotently in sqlite.ts.
-- This marker keeps the migration version monotonic without repeating unsafe
-- ALTER TABLE ADD COLUMN statements on installed databases.

SELECT 1;
