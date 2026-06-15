-- =============================================================
-- MIGRATION 020 - Label template calibration
-- =============================================================
--
-- The calibration_x/calibration_y columns are guaranteed idempotently in
-- sqlite.ts. This migration is intentionally free of ALTER TABLE ADD COLUMN
-- statements so databases that already received the columns through the
-- runtime compatibility pass do not fail when version 20 is registered.

UPDATE label_templates
SET paper_size = 'Letter',
    margin_left_mm = 4.0,
    gap_x_mm = 3.9,
    margin_top_mm = 12.7,
    gap_y_mm = 0,
    description = 'Folha Carta com 30 etiquetas, aproximado 25,4 x 66,7 mm.'
WHERE id = 'label-template-pimaco-6080';
