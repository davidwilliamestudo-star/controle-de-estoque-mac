-- =============================================================
-- MIGRATION 002 — Seed de Desenvolvimento
-- Dados iniciais para facilitar o desenvolvimento/testes
-- =============================================================

-- Settings da clínica
INSERT OR IGNORE INTO settings (id, clinic_id, key, value) VALUES
  ('set-01', 'ana-morong-clinic', 'clinic_name', 'Dra. Ana Morong'),
  ('set-02', 'ana-morong-clinic', 'professional_name', 'Dra. Ana Morong'),
  ('set-03', 'ana-morong-clinic', 'expiration_alert_days', '30'),
  ('set-04', 'ana-morong-clinic', 'auto_backup_enabled', 'true'),
  ('set-05', 'ana-morong-clinic', 'block_expired_items', 'true'),
  ('set-06', 'ana-morong-clinic', 'google_calendar_sync_enabled', 'false'),
  ('set-07', 'ana-morong-clinic', 'lock_after_minutes', '30');

-- Usuaria padrao (senha de desenvolvimento: Ana2026!)
INSERT OR IGNORE INTO users (id, clinic_id, name, email, password_hash, role, is_active) VALUES
  ('user-ana-01', 'ana-morong-clinic', 'Dra. Ana Morong', 'ana@morong.med.br',
   'pbkdf2_sha256$210000$D1o0rsNGe2aQ/YBYTbztZg==$yG6I9mTfYN2IqJeWGhRlLucJdb/yoqUw8afUG1xjcYU=', 'admin', 1);

-- Vias de aplicação
INSERT OR IGNORE INTO administration_routes (id, clinic_id, name, description, is_active) VALUES
  ('route-ev',   'ana-morong-clinic', 'Endovenosa',     'Via endovenosa (EV)', 1),
  ('route-im',   'ana-morong-clinic', 'Intramuscular',  'Via intramuscular (IM)', 1),
  ('route-sc',   'ana-morong-clinic', 'Subcutânea',     'Via subcutânea (SC)', 1),
  ('route-oral', 'ana-morong-clinic', 'Oral',           'Via oral', 1),
  ('route-top',  'ana-morong-clinic', 'Tópica',         'Uso tópico', 1),
  ('route-na',   'ana-morong-clinic', 'Não aplicável',  'Sem via de aplicação específica', 1);

-- Áreas corporais
INSERT OR IGNORE INTO body_areas (id, clinic_id, name, slug, svg_region_id, is_active) VALUES
  ('area-gluteo-d',    'ana-morong-clinic', 'Glúteo Direito',      'gluteo-direito',       'gluteo_d', 1),
  ('area-gluteo-e',    'ana-morong-clinic', 'Glúteo Esquerdo',     'gluteo-esquerdo',      'gluteo_e', 1),
  ('area-deltoide-d',  'ana-morong-clinic', 'Deltoide Direito',    'deltoide-direito',     'deltoide_d', 1),
  ('area-deltoide-e',  'ana-morong-clinic', 'Deltoide Esquerdo',   'deltoide-esquerdo',    'deltoide_e', 1),
  ('area-abdomen',     'ana-morong-clinic', 'Abdômen',             'abdomen',              'abdomen', 1),
  ('area-coxa-d',      'ana-morong-clinic', 'Coxa Direita',        'coxa-direita',         'coxa_d', 1),
  ('area-coxa-e',      'ana-morong-clinic', 'Coxa Esquerda',       'coxa-esquerda',        'coxa_e', 1),
  ('area-braco-d',     'ana-morong-clinic', 'Braço Direito',       'braco-direito',        'braco_d', 1),
  ('area-braco-e',     'ana-morong-clinic', 'Braço Esquerdo',      'braco-esquerdo',       'braco_e', 1),
  ('area-lombar',      'ana-morong-clinic', 'Região Lombar',       'regiao-lombar',        'lombar', 1),
  ('area-antebraco-d', 'ana-morong-clinic', 'Antebraço Direito',   'antebraco-direito',    'antebraco_d', 1),
  ('area-antebraco-e', 'ana-morong-clinic', 'Antebraço Esquerdo',  'antebraco-esquerdo',   'antebraco_e', 1),
  ('area-mao-d',       'ana-morong-clinic', 'Mão Direita',         'mao-direita',          'mao_d', 1),
  ('area-mao-e',       'ana-morong-clinic', 'Mão Esquerda',        'mao-esquerda',         'mao_e', 1);

-- Mapeamento Via → Áreas permitidas
-- Endovenosa: braços, antebraços, mãos
INSERT OR IGNORE INTO route_body_areas (id, clinic_id, administration_route_id, body_area_id) VALUES
  ('rba-ev-01', 'ana-morong-clinic', 'route-ev', 'area-braco-d'),
  ('rba-ev-02', 'ana-morong-clinic', 'route-ev', 'area-braco-e'),
  ('rba-ev-03', 'ana-morong-clinic', 'route-ev', 'area-antebraco-d'),
  ('rba-ev-04', 'ana-morong-clinic', 'route-ev', 'area-antebraco-e'),
  ('rba-ev-05', 'ana-morong-clinic', 'route-ev', 'area-mao-d'),
  ('rba-ev-06', 'ana-morong-clinic', 'route-ev', 'area-mao-e');

-- Intramuscular: glúteos, deltoides, coxas
INSERT OR IGNORE INTO route_body_areas (id, clinic_id, administration_route_id, body_area_id) VALUES
  ('rba-im-01', 'ana-morong-clinic', 'route-im', 'area-gluteo-d'),
  ('rba-im-02', 'ana-morong-clinic', 'route-im', 'area-gluteo-e'),
  ('rba-im-03', 'ana-morong-clinic', 'route-im', 'area-deltoide-d'),
  ('rba-im-04', 'ana-morong-clinic', 'route-im', 'area-deltoide-e'),
  ('rba-im-05', 'ana-morong-clinic', 'route-im', 'area-coxa-d'),
  ('rba-im-06', 'ana-morong-clinic', 'route-im', 'area-coxa-e');

-- Subcutânea: abdômen, braços, coxas
INSERT OR IGNORE INTO route_body_areas (id, clinic_id, administration_route_id, body_area_id) VALUES
  ('rba-sc-01', 'ana-morong-clinic', 'route-sc', 'area-abdomen'),
  ('rba-sc-02', 'ana-morong-clinic', 'route-sc', 'area-braco-d'),
  ('rba-sc-03', 'ana-morong-clinic', 'route-sc', 'area-braco-e'),
  ('rba-sc-04', 'ana-morong-clinic', 'route-sc', 'area-coxa-d'),
  ('rba-sc-05', 'ana-morong-clinic', 'route-sc', 'area-coxa-e');

-- Categorias
INSERT OR IGNORE INTO inventory_categories (id, clinic_id, name, applies_to, is_active) VALUES
  ('cat-vit',    'ana-morong-clinic', 'Vitaminas e Suplementos',    'medication', 1),
  ('cat-ev',     'ana-morong-clinic', 'Medicamentos EV',            'medication', 1),
  ('cat-im',     'ana-morong-clinic', 'Medicamentos IM',            'medication', 1),
  ('cat-sc',     'ana-morong-clinic', 'Medicamentos SC',            'medication', 1),
  ('cat-ser',    'ana-morong-clinic', 'Seringas',                   'material',   1),
  ('cat-agulha', 'ana-morong-clinic', 'Agulhas',                    'material',   1),
  ('cat-desc',   'ana-morong-clinic', 'Descartáveis',               'material',   1),
  ('cat-equip',  'ana-morong-clinic', 'Equipamentos',               'equipment',  1),
  ('cat-outros', 'ana-morong-clinic', 'Outros',                     'all',        1);

-- Template de evolução padrão
INSERT OR IGNORE INTO evolution_templates (id, clinic_id, name, template_text, is_default, is_active) VALUES
  ('tmpl-01', 'ana-morong-clinic', 'Evolução Padrão',
   'Paciente {{patient_name}} realizou {{protocol_name}} em {{procedure_date}}.

Área registrada: {{body_area}}.

Medicamentos utilizados:
{{medications}}

Materiais utilizados:
{{materials}}

Procedimento registrado {{intercurrence_status}}.

Observações: {{notes}}',
   1, 1);
