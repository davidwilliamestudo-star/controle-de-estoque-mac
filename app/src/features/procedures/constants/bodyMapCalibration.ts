export const BODY_MAP_BASE_SIZE = {
  width: 1792,
  height: 2400,
} as const;

export const BODY_MAP_ORIGINAL_SVG_SIZE = {
  width: 373.68,
  height: 267.84,
} as const;

/**
 * Transformação aplicada aos paths antigos do SVG.
 * Os paths continuam no sistema 373.68 x 267.84,
 * mas são renderizados dentro de um SVG externo 1792 x 2400.
 *
 * Ajustar esses valores até as áreas encaixarem perfeitamente no corpo.
 */
export const BODY_MAP_PATH_TRANSFORM = {
  translateX: 137,
  translateY: 497,
  scaleX: 4.22,
  scaleY: 4.3,
} as const;
