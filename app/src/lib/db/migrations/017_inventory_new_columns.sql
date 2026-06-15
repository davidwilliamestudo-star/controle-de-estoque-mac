-- =============================================================
-- MIGRATION 017 - Inventory compatibility marker
-- =============================================================
--
-- The inventory specialization columns are created by migration 015.
-- This version remains registered so existing migration histories stay
-- monotonic, but it must not repeat ALTER TABLE ADD COLUMN statements.
-- Runtime compatibility for lagging databases is handled in sqlite.ts.

SELECT 1;
