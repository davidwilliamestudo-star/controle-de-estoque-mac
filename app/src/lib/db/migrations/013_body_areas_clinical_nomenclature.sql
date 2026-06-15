-- 013_body_areas_clinical_nomenclature.sql
-- =============================================================
-- MIGRATION 013 - Body areas clinical nomenclature compatibility marker
-- =============================================================
--
-- Older installed databases may already have the body_areas compatibility
-- columns from the runtime schema pass while version 013 is still not recorded
-- in _sqlx_migrations. The original migration rebuilt the body_areas table and
-- could rewrite clinical data unnecessarily in that state.
--
-- Structural compatibility is guaranteed idempotently in sqlite.ts. Keep this
-- migration as a safe marker so migration history can advance without dropping
-- or recreating user data tables.

SELECT 1;
