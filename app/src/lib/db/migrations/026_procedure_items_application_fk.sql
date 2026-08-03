-- Migration 026: Adicionar colunas de integração para procedure_applications
-- Corrige o schema para suportar múltiplas aplicações por sessão clínica.
--
-- A migration 025 criou a tabela procedure_applications mas não alterou
-- procedure_items_used para referenciar uma aplicação específica.
-- Esta migration corrige isso de forma segura com colunas NULLABLE.

-- 1. Adicionar procedure_application_id em procedure_items_used
--    (NULL para registros legados, preenchido para novos registros)
ALTER TABLE procedure_items_used
  ADD COLUMN procedure_application_id TEXT REFERENCES procedure_applications(id);

-- 2. Adicionar colunas de correção que o repositório usa mas nunca foram adicionadas ao schema
ALTER TABLE procedure_items_used
  ADD COLUMN is_corrected INTEGER NOT NULL DEFAULT 0;

ALTER TABLE procedure_items_used
  ADD COLUMN corrected_at TEXT;

ALTER TABLE procedure_items_used
  ADD COLUMN correction_group_id TEXT;

-- 3. Índice para acelerar buscas por aplicação
CREATE INDEX IF NOT EXISTS idx_proc_items_application
  ON procedure_items_used(procedure_application_id);
