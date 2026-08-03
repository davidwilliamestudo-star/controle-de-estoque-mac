import { useState } from "react";
import { Info, MapPin, X } from "lucide-react";
import {
  BODY_AREA_MAP,
  ROUTE_COLORS,
  type RouteCode,
  type BodyAreaMapEntry,
} from "../constants/bodyAreaMap";
import type { BodyArea } from "../repositories/procedures.repository";
import { BODY_MAP_SVG_PATHS } from "../constants/bodyMapPaths";
import { BodyMapCanvas } from "./BodyMapCanvas";
import { BODY_MAP_PATH_TRANSFORM } from "../constants/bodyMapCalibration";

const SHOW_BODY_MAP_DEBUG = false;

interface MultiBodyAreaSelectorProps {
  /** IDs de área do corpo já selecionadas (cada aplicação) */
  selectedBodyAreaIds: string[];
  bodyAreas: BodyArea[];
  /** Via de administração sugerida (ex: 'EV', 'IM') pela aplicação em foco */
  activeRouteCode?: RouteCode | null;
  /** Chamado quando o usuário clica em uma área do mapa */
  onAreaClick: (areaKey: string, bodyAreaId: string) => void;
}

/** Acesso null-safe ao ROUTE_COLORS */
function rc(code: string | RouteCode | null | undefined) {
  if (!code) return null;
  const k = String(code).toUpperCase() as RouteCode;
  return ROUTE_COLORS[k] ?? null;
}

/** Quantas vezes cada bodyAreaId aparece nas aplicações */
function countByBodyAreaId(ids: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const id of ids) {
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

/**
 * Versão do BodyAreaSelector com suporte a múltiplas seleções independentes.
 * - Funciona sem routeCode: todas as áreas ficam visíveis e clicáveis.
 * - Clique em área → cria nova aplicação com aquela área pré-selecionada.
 * - Áreas com aplicações ativas ficam coloridas; badge numérico se > 1.
 */
export function MultiBodyAreaSelector({
  selectedBodyAreaIds,
  bodyAreas,
  activeRouteCode,
  onAreaClick,
}: MultiBodyAreaSelectorProps) {
  const [hoveredSvgId, setHoveredSvgId] = useState<string | null>(null);
  const [debugTransform] = useState({ ...BODY_MAP_PATH_TRANSFORM });

  const findDbArea = (areaKey: string): BodyArea | undefined =>
    bodyAreas.find((ba) => ba.slug === areaKey);

  /** Mapa: bodyAreaId → count de aplicações */
  const activeCounts = countByBodyAreaId(selectedBodyAreaIds);

  /** Verifica se uma entrada do mapa está ativa (tem pelo menos uma aplicação) */
  const isActive = (entry: BodyAreaMapEntry): boolean => {
    const dbArea = findDbArea(entry.areaKey);
    return dbArea ? activeCounts.has(dbArea.id) : false;
  };

  const getPathStyle = (entry: BodyAreaMapEntry): React.CSSProperties => {
    const active = isActive(entry);
    const isHovered = entry.svgId === hoveredSvgId;

    // Usa a cor da via do mapa para colorir, ou cinza padrão se via não mapeada
    const routeColor = rc(entry.routeCode);
    const activeFill = routeColor?.fill ?? "#6b7280";
    const activeStroke = routeColor?.stroke ?? "#374151";

    if (active) {
      return {
        fill: activeFill,
        opacity: isHovered ? 1 : 0.85,
        stroke: activeStroke,
        strokeWidth: isHovered ? 3 : 2.5,
        strokeDasharray: "8 5",
        filter: "drop-shadow(0 0 8px rgba(0,0,0,0.25))",
        cursor: "pointer",
        transition: "all 0.15s ease",
      };
    }

    if (isHovered) {
      return {
        fill: activeFill,
        opacity: 0.55,
        stroke: activeStroke,
        strokeWidth: 2,
        cursor: "pointer",
        transition: "all 0.1s ease",
      };
    }

    // Lógica de bloqueio visual baseado na via do medicamento em foco
    let baseOpacity = 0.18; // Padrão
    if (activeRouteCode) {
      if (entry.routeCode === activeRouteCode) {
        baseOpacity = 0.65; // Via sugerida pelo medicamento
      } else {
        baseOpacity = 0.05; // Via bloqueada visualmente (apagada)
      }
    }

    // Inativo mas visível e clicável (podendo quebrar a trava)
    return {
      fill: activeFill,
      opacity: baseOpacity,
      cursor: "pointer",
      transition: "all 0.15s ease",
    };
  };

  const handleClick = (entry: BodyAreaMapEntry) => {
    const dbArea = findDbArea(entry.areaKey);
    if (!dbArea) return;
    onAreaClick(entry.areaKey, dbArea.id);
  };

  const hoveredEntry = hoveredSvgId
    ? BODY_AREA_MAP.find((e) => e.svgId === hoveredSvgId)
    : null;
  const hoveredDbArea = hoveredEntry ? findDbArea(hoveredEntry.areaKey) : null;

  // Áreas únicas com pelo menos 1 aplicação (para exibir legenda)
  const activeEntries = BODY_AREA_MAP.filter((e) => isActive(e));

  return (
    <div className="flex flex-col gap-2 w-full h-full">
      {/* Legenda das áreas ativas */}
      {activeEntries.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {activeEntries.map((entry) => {
            const dbArea = findDbArea(entry.areaKey);
            const count = dbArea ? (activeCounts.get(dbArea.id) ?? 0) : 0;
            const color = rc(entry.routeCode);
            return (
              <span
                key={entry.svgId}
                className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: color ? `${color.fill}22` : "#f3f4f6",
                  color: color?.stroke ?? "#374151",
                  border: `1.5px solid ${color?.fill ?? "#d1d5db"}`,
                }}
              >
                <MapPin size={10} />
                {dbArea?.displayName || dbArea?.name || entry.displayName}
                {count > 1 && (
                  <span
                    className="ml-0.5 rounded-full px-1 text-white text-[10px] font-bold"
                    style={{ background: color?.fill ?? "#6b7280" }}
                  >
                    ×{count}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      ) : (
        <div
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-dashed"
          style={{ backgroundColor: "var(--color-gray-50)", color: "var(--color-gray-500)" }}
        >
          <Info size={13} />
          Clique em uma área do corpo para adicionar uma aplicação
        </div>
      )}

      {/* Container do mapa */}
      <div
        className="relative w-full flex-1 select-none rounded-xl overflow-hidden border flex items-center justify-center bg-gray-50"
        style={{
          borderColor: "var(--color-gray-200)",
          backgroundColor: "#f8f9fa",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)",
          minHeight: "420px",
        }}
      >
        <BodyMapCanvas
          showDebug={SHOW_BODY_MAP_DEBUG}
          transformOverride={SHOW_BODY_MAP_DEBUG ? debugTransform : null}
        >
          {BODY_AREA_MAP.map((entry) => (
            <SvgAreaPath
              key={entry.svgId}
              entry={entry}
              style={getPathStyle(entry)}
              onMouseEnter={() => setHoveredSvgId(entry.svgId)}
              onMouseLeave={() => setHoveredSvgId(null)}
              onClick={() => handleClick(entry)}
            />
          ))}

          {/* Tooltip hover */}
          {hoveredEntry && (
            <div
              className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-white px-3 py-1.5 rounded-full shadow-lg pointer-events-none"
              style={{
                backgroundColor: rc(hoveredEntry.routeCode)?.fill ?? "#374151",
                border: "1.5px solid rgba(255,255,255,0.4)",
                backdropFilter: "blur(4px)",
              }}
            >
              {hoveredDbArea?.displayName ||
                hoveredDbArea?.name ||
                hoveredEntry.displayName}
              {isActive(hoveredEntry) && (
                <span className="ml-1 opacity-75">· clique para mais uma</span>
              )}
            </div>
          )}
        </BodyMapCanvas>
      </div>
    </div>
  );
}

// ─── SVG Path Renderer ────────────────────────────────────────────────────────

interface SvgAreaPathProps {
  entry: BodyAreaMapEntry;
  style: React.CSSProperties;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

function SvgAreaPath({
  entry,
  style,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: SvgAreaPathProps) {
  const pathData = BODY_MAP_SVG_PATHS[entry.svgId];
  if (!pathData) return null;
  return (
    <path
      d={pathData}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      role="button"
      aria-label={entry.displayName}
    />
  );
}
