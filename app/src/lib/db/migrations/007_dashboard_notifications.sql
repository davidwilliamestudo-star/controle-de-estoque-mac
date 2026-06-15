-- =============================================================
-- MIGRATION 007 - Dashboard e notificacoes operacionais
-- =============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id             TEXT PRIMARY KEY,
  clinic_id      TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  user_id        TEXT REFERENCES users(id),
  type           TEXT NOT NULL,
  title          TEXT NOT NULL,
  message        TEXT NOT NULL,
  entity_type    TEXT,
  entity_id      TEXT,
  severity       TEXT NOT NULL DEFAULT 'medium' CHECK(severity IN ('critical','high','medium','low','info')),
  status         TEXT NOT NULL DEFAULT 'unread' CHECK(status IN ('unread','read','resolved','dismissed')),
  action_url     TEXT,
  metadata_json  TEXT,
  read_at        TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_active_dedupe
  ON notifications(clinic_id, type, entity_type, entity_id)
  WHERE deleted_at IS NULL AND status IN ('unread','read');

CREATE TABLE IF NOT EXISTS dashboard_preferences (
  id                   TEXT PRIMARY KEY,
  clinic_id            TEXT NOT NULL DEFAULT 'ana-morong-clinic',
  user_id              TEXT REFERENCES users(id),
  default_period       TEXT NOT NULL DEFAULT '30d',
  visible_cards_json   TEXT,
  visible_charts_json  TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(clinic_id, user_id)
);
