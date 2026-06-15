-- =============================================================
-- MIGRATION 018 - Suppliers expansion compatibility marker
-- =============================================================
--
-- Supplier expansion columns are guaranteed idempotently in sqlite.ts.
-- This marker prevents failures on databases that already received the columns
-- through the runtime compatibility pass.

SELECT 1;
