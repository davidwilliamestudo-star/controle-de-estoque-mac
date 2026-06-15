-- =============================================================
-- MIGRATION 002 — Seed: Rotas de Administração + Áreas Corporais
-- Sistema: Controle de Estoque — Dra. Ana Morong
-- =============================================================

-- Rotas de Administração (EV, IM, SC)
INSERT OR IGNORE INTO administration_routes (id, clinic_id, name, description, is_active) VALUES
  ('route-ev', 'ana-morong-clinic', 'EV', 'Endovenosa / Intravenosa', 1),
  ('route-im', 'ana-morong-clinic', 'IM', 'Intramuscular', 1),
  ('route-sc', 'ana-morong-clinic', 'SC', 'Subcutânea', 1);

-- Áreas Corporais — EV (8 áreas)
INSERT OR IGNORE INTO body_areas (id, clinic_id, name, slug, svg_region_id, description, is_active) VALUES
  ('ba-ev-mao-dir',      'ana-morong-clinic', 'Mão Direita',              'ev_mao_direita',              'ev-mao-direita',              'Via EV - Mão Direita',              1),
  ('ba-ev-ante-cd',      'ana-morong-clinic', 'Antebraço Costa Direito',  'ev_antebraco_costa_direito',  'ev-antebraco-costa-direito',  'Via EV - Antebraço Costa Direito',  1),
  ('ba-ev-mao-esq',      'ana-morong-clinic', 'Mão Esquerda',             'ev_mao_esquerda',             'ev-mao-esquerda',             'Via EV - Mão Esquerda',             1),
  ('ba-ev-ante-ce',      'ana-morong-clinic', 'Antebraço Costa Esquerdo', 'ev_antebraco_costa_esquerdo', 'ev-antebraco-costa-esquerdo', 'Via EV - Antebraço Costa Esquerdo', 1),
  ('ba-ev-ante-dir',     'ana-morong-clinic', 'Antebraço Direito',        'ev_antebraco_direito',        'ev-antebraco-direito',        'Via EV - Antebraço Direito',        1),
  ('ba-ev-veia-mbd',     'ana-morong-clinic', 'Veia Meio Braço Direito',  'ev_veia_meio_braco_direito',  'ev-veia-meio-braco-direito',  'Via EV - Veia Meio Braço Direito',  1),
  ('ba-ev-ante-esq',     'ana-morong-clinic', 'Antebraço Esquerdo',       'ev_antebraco_esquerdo',       'ev-antebraco-esquerdo',       'Via EV - Antebraço Esquerdo',       1),
  ('ba-ev-veia-mbe',     'ana-morong-clinic', 'Veia Meio Braço Esquerdo', 'ev_veia_meio_braco_esquerdo', 'ev-veia-meio-braco-esquerdo', 'Via EV - Veia Meio Braço Esquerdo', 1);

-- Áreas Corporais — IM (8 áreas)
INSERT OR IGNORE INTO body_areas (id, clinic_id, name, slug, svg_region_id, description, is_active) VALUES
  ('ba-im-ombro-dir',    'ana-morong-clinic', 'Ombro Direito',           'im_ombro_direito',           'im-ombro-direito',           'Via IM - Ombro Direito',           1),
  ('ba-im-ombro-esq',    'ana-morong-clinic', 'Ombro Esquerdo',          'im_ombro_esquerdo',          'im-ombro-esquerdo',          'Via IM - Ombro Esquerdo',          1),
  ('ba-im-gluteo-dir',   'ana-morong-clinic', 'Glúteo Direito',          'im_gluteo_direito',          'im-gluteo-direito',          'Via IM - Glúteo Direito',          1),
  ('ba-im-gluteo-esq',   'ana-morong-clinic', 'Glúteo Esquerdo',         'im_gluteo_esquerdo',         'im-gluteo-esquerdo',         'Via IM - Glúteo Esquerdo',         1),
  ('ba-im-lat-glu-dir',  'ana-morong-clinic', 'Lateral Glúteo Direito',  'im_lateral_gluteo_direito',  'im-lateral-gluteo-direito',  'Via IM - Lateral Glúteo Direito',  1),
  ('ba-im-lat-glu-esq',  'ana-morong-clinic', 'Lateral Glúteo Esquerdo', 'im_lateral_gluteo_esquerdo', 'im-lateral-gluteo-esquerdo', 'Via IM - Lateral Glúteo Esquerdo', 1),
  ('ba-im-coxa-esq',     'ana-morong-clinic', 'Coxa Esquerda',           'im_coxa_esquerda',           'im-coxa-esquerda',           'Via IM - Coxa Esquerda',           1),
  ('ba-im-coxa-dir',     'ana-morong-clinic', 'Coxa Direita',            'im_coxa_direita',            'im-coxa-direita',            'Via IM - Coxa Direita',            1);

-- Áreas Corporais — SC (11 áreas)
INSERT OR IGNORE INTO body_areas (id, clinic_id, name, slug, svg_region_id, description, is_active) VALUES
  ('ba-sc-ccme',  'ana-morong-clinic', 'Campo Coxa Menor Esq.',    'sc_campo_coxa_menor_esquerda', 'sc-campo-coxa-menor-esquerda', 'Via SC - Campo Coxa Menor Esq.', 1),
  ('ba-sc-ccmd',  'ana-morong-clinic', 'Campo Coxa Menor Dir.',    'sc_campo_coxa_menor_direita',  'sc-campo-coxa-menor-direita',  'Via SC - Campo Coxa Menor Dir.', 1),
  ('ba-sc-tmadir','ana-morong-clinic', 'Tríceps Maior Direita',    'sc_triceps_maior_direita',     'sc-triceps-maior-direita',     'Via SC - Tríceps Maior Dir.',    1),
  ('ba-sc-tmaesq','ana-morong-clinic', 'Tríceps Maior Esquerdo',   'sc_triceps_maior_esquerdo',    'sc-triceps-maior-esquerdo',    'Via SC - Tríceps Maior Esq.',    1),
  ('ba-sc-tmendir','ana-morong-clinic','Tríceps Menor Direita',    'sc_triceps_menor_direita',     'sc-triceps-menor-direita',     'Via SC - Tríceps Menor Dir.',    1),
  ('ba-sc-tmenesq','ana-morong-clinic','Tríceps Menor Esquerdo',   'sc_triceps_menor_esquerdo',    'sc-triceps-menor-esquerdo',    'Via SC - Tríceps Menor Esq.',    1),
  ('ba-sc-costa', 'ana-morong-clinic', 'Costas',                   'sc_costa',                     'sc-costa',                     'Via SC - Costas',                1),
  ('ba-sc-coxa-e','ana-morong-clinic', 'Coxa Esquerda SC',         'sc_coxa_esquerda',             'sc-coxa-esquerda',             'Via SC - Coxa Esquerda',         1),
  ('ba-sc-coxa-d','ana-morong-clinic', 'Coxa Direita SC',          'sc_coxa_direita',              'sc-coxa-direita',              'Via SC - Coxa Direita',          1),
  ('ba-sc-barriga','ana-morong-clinic','Barriga / Abdômen',        'sc_barriga',                   'sc-barriga',                   'Via SC - Barriga / Abdômen',     1),
  ('ba-sc-cint-d', 'ana-morong-clinic','Cintura Direita',          'sc_cintura_direita',           'sc-cintura-direita',           'Via SC - Cintura Direita',       1),
  ('ba-sc-cint-e', 'ana-morong-clinic','Cintura Esquerda',         'sc_cintura_esquerda',          'sc-cintura-esquerda',          'Via SC - Cintura Esquerda',      1);

-- Ligações route_body_areas — EV
INSERT OR IGNORE INTO route_body_areas (id, clinic_id, administration_route_id, body_area_id) VALUES
  ('rba-ev-1','ana-morong-clinic','route-ev','ba-ev-mao-dir'),
  ('rba-ev-2','ana-morong-clinic','route-ev','ba-ev-ante-cd'),
  ('rba-ev-3','ana-morong-clinic','route-ev','ba-ev-mao-esq'),
  ('rba-ev-4','ana-morong-clinic','route-ev','ba-ev-ante-ce'),
  ('rba-ev-5','ana-morong-clinic','route-ev','ba-ev-ante-dir'),
  ('rba-ev-6','ana-morong-clinic','route-ev','ba-ev-veia-mbd'),
  ('rba-ev-7','ana-morong-clinic','route-ev','ba-ev-ante-esq'),
  ('rba-ev-8','ana-morong-clinic','route-ev','ba-ev-veia-mbe');

-- Ligações route_body_areas — IM
INSERT OR IGNORE INTO route_body_areas (id, clinic_id, administration_route_id, body_area_id) VALUES
  ('rba-im-1','ana-morong-clinic','route-im','ba-im-ombro-dir'),
  ('rba-im-2','ana-morong-clinic','route-im','ba-im-ombro-esq'),
  ('rba-im-3','ana-morong-clinic','route-im','ba-im-gluteo-dir'),
  ('rba-im-4','ana-morong-clinic','route-im','ba-im-gluteo-esq'),
  ('rba-im-5','ana-morong-clinic','route-im','ba-im-lat-glu-dir'),
  ('rba-im-6','ana-morong-clinic','route-im','ba-im-lat-glu-esq'),
  ('rba-im-7','ana-morong-clinic','route-im','ba-im-coxa-esq'),
  ('rba-im-8','ana-morong-clinic','route-im','ba-im-coxa-dir');

-- Ligações route_body_areas — SC
INSERT OR IGNORE INTO route_body_areas (id, clinic_id, administration_route_id, body_area_id) VALUES
  ('rba-sc-1', 'ana-morong-clinic','route-sc','ba-sc-ccme'),
  ('rba-sc-2', 'ana-morong-clinic','route-sc','ba-sc-ccmd'),
  ('rba-sc-3', 'ana-morong-clinic','route-sc','ba-sc-tmadir'),
  ('rba-sc-4', 'ana-morong-clinic','route-sc','ba-sc-tmaesq'),
  ('rba-sc-5', 'ana-morong-clinic','route-sc','ba-sc-tmendir'),
  ('rba-sc-6', 'ana-morong-clinic','route-sc','ba-sc-tmenesq'),
  ('rba-sc-7', 'ana-morong-clinic','route-sc','ba-sc-costa'),
  ('rba-sc-8', 'ana-morong-clinic','route-sc','ba-sc-coxa-e'),
  ('rba-sc-9', 'ana-morong-clinic','route-sc','ba-sc-coxa-d'),
  ('rba-sc-10','ana-morong-clinic','route-sc','ba-sc-barriga'),
  ('rba-sc-11','ana-morong-clinic','route-sc','ba-sc-cint-d'),
  ('rba-sc-12','ana-morong-clinic','route-sc','ba-sc-cint-e');
