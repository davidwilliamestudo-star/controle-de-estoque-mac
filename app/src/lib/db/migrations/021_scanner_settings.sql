-- Migration 021: Campos de configuração do Leitor de Câmera
-- Adiciona as preferências do scanner à tabela de settings existente.
-- Como settings usa key/value, não há alteração estrutural na tabela —
-- apenas inserimos valores padrão seguros via INSERT OR IGNORE.

INSERT OR IGNORE INTO settings (id, clinic_id, key, value, updated_at)
VALUES
  (lower(hex(randomblob(16))), 'ana-morong-clinic', 'scanner_enabled',              'true', datetime('now')),
  (lower(hex(randomblob(16))), 'ana-morong-clinic', 'scanner_mode',                 'qr',   datetime('now')),
  (lower(hex(randomblob(16))), 'ana-morong-clinic', 'scanner_preferred_camera_id',  '',     datetime('now'));
