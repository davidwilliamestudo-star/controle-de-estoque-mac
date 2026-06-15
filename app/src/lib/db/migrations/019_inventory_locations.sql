-- =============================================================
-- MIGRATION 019 - Inventory locations compatibility marker
-- =============================================================
--
-- Inventory location tables, default location, location stock backfill and
-- location_id columns are guaranteed idempotently in sqlite.ts. The original
-- migration inserted rows without clinic_id into a NOT NULL column, so the
-- operational work lives in the runtime compatibility pass.

SELECT 1;
