-- =============================================================
-- MIGRATION 015 - Inventory refactoring compatibility marker
-- =============================================================
--
-- Inventory specialization columns are guaranteed idempotently in sqlite.ts.
-- Installed databases may already have these columns even when migration 015 is
-- not recorded in _sqlx_migrations, so this migration must not repeat ALTER
-- TABLE ADD COLUMN statements.

SELECT 1;
