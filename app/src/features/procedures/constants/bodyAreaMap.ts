/** 
 * Mapeamento oficial entre os IDs do SVG e os registros reais do banco de dados.
 * Cada entrada vincula o svgId (camada do SVG) ao body_area.slug no banco.
 */

export type RouteCode = "EV" | "IM" | "SC";

export interface BodyAreaMapEntry {
  svgId: string;         // ID do <g> ou <path> no SVG
  areaKey: string;       // slug único, igual ao campo `slug` em body_areas
  displayName: string;   // Nome amigável para exibir na UI
  routeCode: RouteCode;  // Via de administração
  view: "front" | "back" | "side"; // Perspectiva no mapa
  side: "left" | "right" | "center"; // Lado do corpo
}

export const BODY_AREA_MAP: BodyAreaMapEntry[] = [
  // ─── EV ───────────────────────────────────────────────────────────────────
  {
    svgId: "ev-mao-direita",
    areaKey: "ev_mao_direita",
    displayName: "Mão Direita",
    routeCode: "EV",
    view: "front",
    side: "right",
  },
  {
    svgId: "ev-antebraco-costa-direito",
    areaKey: "ev_antebraco_costa_direito",
    displayName: "Antebraço Costa Direito",
    routeCode: "EV",
    view: "back",
    side: "right",
  },
  {
    svgId: "ev-mao-esquerda",
    areaKey: "ev_mao_esquerda",
    displayName: "Mão Esquerda",
    routeCode: "EV",
    view: "front",
    side: "left",
  },
  {
    svgId: "ev-antebraco-costa-esquerdo",
    areaKey: "ev_antebraco_costa_esquerdo",
    displayName: "Antebraço Costa Esquerdo",
    routeCode: "EV",
    view: "back",
    side: "left",
  },
  {
    svgId: "ev-antebraco-direito",
    areaKey: "ev_antebraco_direito",
    displayName: "Antebraço Direito",
    routeCode: "EV",
    view: "front",
    side: "right",
  },
  {
    svgId: "ev-veia-meio-braco-direito",
    areaKey: "ev_veia_meio_braco_direito",
    displayName: "Veia Meio Braço Direito",
    routeCode: "EV",
    view: "front",
    side: "right",
  },
  {
    svgId: "ev-antebraco-esquerdo",
    areaKey: "ev_antebraco_esquerdo",
    displayName: "Antebraço Esquerdo",
    routeCode: "EV",
    view: "front",
    side: "left",
  },
  {
    svgId: "ev-veia-meio-braco-esquerdo",
    areaKey: "ev_veia_meio_braco_esquerdo",
    displayName: "Veia Meio Braço Esquerdo",
    routeCode: "EV",
    view: "front",
    side: "left",
  },

  // ─── IM ───────────────────────────────────────────────────────────────────
  {
    svgId: "im-ombro-direito",
    areaKey: "im_ombro_direito",
    displayName: "Ombro Direito",
    routeCode: "IM",
    view: "front",
    side: "right",
  },
  {
    svgId: "im-ombro-esquerdo",
    areaKey: "im_ombro_esquerdo",
    displayName: "Ombro Esquerdo",
    routeCode: "IM",
    view: "front",
    side: "left",
  },
  {
    svgId: "im-gluteo-direito",
    areaKey: "im_gluteo_direito",
    displayName: "Glúteo Direito",
    routeCode: "IM",
    view: "back",
    side: "right",
  },
  {
    svgId: "im-gluteo-esquerdo",
    areaKey: "im_gluteo_esquerdo",
    displayName: "Glúteo Esquerdo",
    routeCode: "IM",
    view: "back",
    side: "left",
  },
  {
    svgId: "im-lateral-gluteo-direito",
    areaKey: "im_lateral_gluteo_direito",
    displayName: "Lateral Glúteo Direito",
    routeCode: "IM",
    view: "back",
    side: "right",
  },
  {
    svgId: "im-lateral-gluteo-esquerdo",
    areaKey: "im_lateral_gluteo_esquerdo",
    displayName: "Lateral Glúteo Esquerdo",
    routeCode: "IM",
    view: "back",
    side: "left",
  },
  {
    svgId: "im-coxa-esquerda",
    areaKey: "im_coxa_esquerda",
    displayName: "Coxa Esquerda",
    routeCode: "IM",
    view: "front",
    side: "left",
  },
  {
    svgId: "im-coxa-direita",
    areaKey: "im_coxa_direita",
    displayName: "Coxa Direita",
    routeCode: "IM",
    view: "front",
    side: "right",
  },

  // ─── SC ───────────────────────────────────────────────────────────────────
  {
    svgId: "sc-campo-coxa-menor-esquerda",
    areaKey: "sc_campo_coxa_menor_esquerda",
    displayName: "Campo Coxa Menor Esq.",
    routeCode: "SC",
    view: "front",
    side: "left",
  },
  {
    svgId: "sc-campo-coxa-menor-direita",
    areaKey: "sc_campo_coxa_menor_direita",
    displayName: "Campo Coxa Menor Dir.",
    routeCode: "SC",
    view: "front",
    side: "right",
  },
  {
    svgId: "sc-triceps-maior-direita",
    areaKey: "sc_triceps_maior_direita",
    displayName: "Tríceps Maior Direita",
    routeCode: "SC",
    view: "back",
    side: "right",
  },
  {
    svgId: "sc-triceps-maior-esquerdo",
    areaKey: "sc_triceps_maior_esquerdo",
    displayName: "Tríceps Maior Esquerdo",
    routeCode: "SC",
    view: "back",
    side: "left",
  },
  {
    svgId: "sc-triceps-menor-direita",
    areaKey: "sc_triceps_menor_direita",
    displayName: "Tríceps Menor Direita",
    routeCode: "SC",
    view: "back",
    side: "right",
  },
  {
    svgId: "sc-triceps-menor-esquerdo",
    areaKey: "sc_triceps_menor_esquerdo",
    displayName: "Tríceps Menor Esquerdo",
    routeCode: "SC",
    view: "back",
    side: "left",
  },
  {
    svgId: "sc-costa",
    areaKey: "sc_costa",
    displayName: "Costas",
    routeCode: "SC",
    view: "back",
    side: "center",
  },
  {
    svgId: "sc-coxa-esquerda",
    areaKey: "sc_coxa_esquerda",
    displayName: "Coxa Esquerda SC",
    routeCode: "SC",
    view: "front",
    side: "left",
  },
  {
    svgId: "sc-coxa-direita",
    areaKey: "sc_coxa_direita",
    displayName: "Coxa Direita SC",
    routeCode: "SC",
    view: "front",
    side: "right",
  },
  {
    svgId: "sc-barriga",
    areaKey: "sc_barriga",
    displayName: "Barriga / Abdômen",
    routeCode: "SC",
    view: "front",
    side: "center",
  },
  {
    svgId: "sc-cintura-direita",
    areaKey: "sc_cintura_direita",
    displayName: "Cintura Direita",
    routeCode: "SC",
    view: "front",
    side: "right",
  },
  {
    svgId: "sc-cintura-esquerda",
    areaKey: "sc_cintura_esquerda",
    displayName: "Cintura Esquerda",
    routeCode: "SC",
    view: "front",
    side: "left",
  },
];

/** Retorna apenas as entradas de uma via específica */
export function getAreasByRoute(routeCode: RouteCode): BodyAreaMapEntry[] {
  return BODY_AREA_MAP.filter(entry => entry.routeCode === routeCode);
}

/** Retorna a entrada pelo svgId */
export function getAreaBySvgId(svgId: string): BodyAreaMapEntry | undefined {
  return BODY_AREA_MAP.find(entry => entry.svgId === svgId);
}

/** Retorna a entrada pela areaKey (slug) */
export function getAreaByKey(areaKey: string): BodyAreaMapEntry | undefined {
  return BODY_AREA_MAP.find(entry => entry.areaKey === areaKey);
}

/** Cores por via de administração */
export const ROUTE_COLORS: Record<RouteCode, { fill: string; stroke: string; label: string }> = {
  EV: { fill: "#2563eb", stroke: "#1d4ed8", label: "Endovenosa (EV)" },
  IM: { fill: "#16a34a", stroke: "#15803d", label: "Intramuscular (IM)" },
  SC: { fill: "#ea580c", stroke: "#c2410c", label: "Subcutânea (SC)" },
};
