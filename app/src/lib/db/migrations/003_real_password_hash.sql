-- =============================================================
-- MIGRATION 003 - Hash real da usuaria padrao
-- Senha de desenvolvimento: Ana2026!
-- =============================================================

UPDATE users
SET password_hash = 'pbkdf2_sha256$210000$D1o0rsNGe2aQ/YBYTbztZg==$yG6I9mTfYN2IqJeWGhRlLucJdb/yoqUw8afUG1xjcYU=',
    updated_at = datetime('now')
WHERE id = 'user-ana-01'
  AND password_hash = '$2a$12$devhash.placeholder.for.development.only';

