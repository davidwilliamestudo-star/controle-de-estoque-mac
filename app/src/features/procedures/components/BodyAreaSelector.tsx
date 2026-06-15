import { useState } from "react";
import { Info, MapPin } from "lucide-react";
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

interface BodyAreaSelectorProps {
  routeCode: RouteCode | null;
  selectedAreaKey: string | null;
  bodyAreas: BodyArea[];
  onSelect: (areaKey: string, bodyAreaId: string) => void;
}

/** Acesso null-safe ao ROUTE_COLORS */
function rc(code: string | RouteCode | null | undefined) {
  if (!code) return null;
  const k = String(code).toUpperCase() as RouteCode;
  return ROUTE_COLORS[k] ?? null;
}

export function BodyAreaSelector({
  routeCode,
  selectedAreaKey,
  bodyAreas,
  onSelect,
}: BodyAreaSelectorProps) {
  const [hoveredSvgId, setHoveredSvgId] = useState<string | null>(null);
  
  // Estado de debug interativo (transiente)
  const [debugTransform, setDebugTransform] = useState({
    translateX: BODY_MAP_PATH_TRANSFORM.translateX as number,
    translateY: BODY_MAP_PATH_TRANSFORM.translateY as number,
    scaleX: BODY_MAP_PATH_TRANSFORM.scaleX as number,
    scaleY: BODY_MAP_PATH_TRANSFORM.scaleY as number,
  });

  const findDbArea = (areaKey: string): BodyArea | undefined =>
    bodyAreas.find(ba => ba.slug === areaKey);

  const getPathStyle = (entry: BodyAreaMapEntry): React.CSSProperties => {
    const isActiveRoute = routeCode && entry.routeCode === routeCode;
    const isSelected = entry.areaKey === selectedAreaKey;
    const isHovered = entry.svgId === hoveredSvgId;

    if (!isActiveRoute) {
      return { opacity: 0, pointerEvents: "none" };
    }

    const color = rc(entry.routeCode);
    if (!color) return { opacity: 0, pointerEvents: "none" };

    if (isSelected) {
      return {
        fill: color.fill,
        opacity: 1,
        stroke: "#1A5347",
        strokeWidth: 4,
        strokeDasharray: "8 6",
        filter: "drop-shadow(0 0 10px rgba(26, 83, 71, 0.5))",
        cursor: "pointer",
        transition: "all 0.15s ease",
      };
    }

    if (isHovered) {
      return {
        fill: color.fill,
        opacity: 0.9,
        stroke: color.stroke,
        strokeWidth: 3,
        cursor: "pointer",
        filter: "brightness(1.1)",
        transition: "all 0.1s ease",
      };
    }

    return {
      fill: color.fill,
      opacity: 0.65,
      cursor: "pointer",
      transition: "all 0.15s ease",
    };
  };

  const handleClick = (entry: BodyAreaMapEntry) => {
    if (!routeCode || entry.routeCode !== routeCode) return;
    const dbArea = findDbArea(entry.areaKey);
    if (!dbArea) return;
    onSelect(entry.areaKey, dbArea.id);
  };

  const hoveredEntry = hoveredSvgId ? BODY_AREA_MAP.find(e => e.svgId === hoveredSvgId) : null;
  const hoveredDbArea = hoveredEntry ? findDbArea(hoveredEntry.areaKey) : null;
  const selectedEntry = selectedAreaKey ? BODY_AREA_MAP.find(e => e.areaKey === selectedAreaKey) : null;
  const selectedDbArea = selectedEntry ? findDbArea(selectedEntry.areaKey) : null;
  const activeColor = rc(routeCode);

  return (
    <div className="flex flex-col gap-3 w-full h-full flex-1 max-w-[760px] mx-auto">
      
      {/* Ferramenta de Calibração (Visível apenas em Debug) */}
      {SHOW_BODY_MAP_DEBUG && (
        <div className="bg-yellow-50 border border-yellow-400 p-3 rounded-lg shadow-sm text-sm mb-2">
          <p className="font-bold text-yellow-800 mb-2">MODO CALIBRAÇÃO ATIVO</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Translate X</label>
              <input 
                type="number" 
                value={debugTransform.translateX} 
                onChange={e => setDebugTransform({...debugTransform, translateX: Number(e.target.value)})}
                className="w-full border rounded px-2 py-1 text-sm mt-1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Translate Y</label>
              <input 
                type="number" 
                value={debugTransform.translateY} 
                onChange={e => setDebugTransform({...debugTransform, translateY: Number(e.target.value)})}
                className="w-full border rounded px-2 py-1 text-sm mt-1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Scale X</label>
              <input 
                type="number" 
                step="0.1" 
                value={debugTransform.scaleX} 
                onChange={e => setDebugTransform({...debugTransform, scaleX: Number(e.target.value)})}
                className="w-full border rounded px-2 py-1 text-sm mt-1"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Scale Y</label>
              <input 
                type="number" 
                step="0.1" 
                value={debugTransform.scaleY} 
                onChange={e => setDebugTransform({...debugTransform, scaleY: Number(e.target.value)})}
                className="w-full border rounded px-2 py-1 text-sm mt-1"
              />
            </div>
          </div>
          <p className="text-xs text-yellow-700 mt-2">
            Ajuste até os músculos encaixarem. Copie os valores e cole em <code>bodyMapCalibration.ts</code>, depois desative esta flag.
          </p>
        </div>
      )}

      {/* Status bar */}
      {!routeCode && (
        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-dashed flex-shrink-0"
          style={{ backgroundColor: "var(--color-gray-50)", color: "var(--color-gray-500)" }}>
          <Info size={13} />
          Selecione um protocolo ou via para ativar as áreas no mapa
        </div>
      )}

      {/* Área selecionada */}
      {selectedEntry && activeColor && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium flex-shrink-0"
          style={{ backgroundColor: `${activeColor.fill}15`, borderLeft: `3px solid ${activeColor.fill}` }}>
          <MapPin size={13} style={{ color: activeColor.fill }} />
          <span style={{ color: activeColor.stroke }}>{selectedDbArea?.displayName || selectedDbArea?.name || selectedEntry.displayName}</span>
          <span className="ml-auto text-xs font-normal" style={{ color: "var(--color-gray-400)" }}>Área selecionada</span>
        </div>
      )}

      {/* Container do mapa — altura flexível, limitado lateralmente */}
      <div
        className="relative w-full flex-1 select-none rounded-xl overflow-hidden border flex items-center justify-center bg-gray-50"
        style={{
          borderColor: "var(--color-gray-200)",
          backgroundColor: "#f8f9fa",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)",
          minHeight: "500px"
        }}
      >
        <BodyMapCanvas 
          showDebug={SHOW_BODY_MAP_DEBUG} 
          transformOverride={SHOW_BODY_MAP_DEBUG ? debugTransform : null}
        >
          {BODY_AREA_MAP.map(entry => (
            <SvgAreaPath
              key={entry.svgId}
              entry={entry}
              style={getPathStyle(entry)}
              onMouseEnter={() => {
                if (routeCode && entry.routeCode === routeCode) {
                  setHoveredSvgId(entry.svgId);
                }
              }}
              onMouseLeave={() => setHoveredSvgId(null)}
              onClick={() => handleClick(entry)}
            />
          ))}

          {/* Tooltip hover */}
          {hoveredEntry && rc(hoveredEntry.routeCode) && (
            <div
              className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-white px-3 py-1.5 rounded-full shadow-lg pointer-events-none"
              style={{
                backgroundColor: rc(hoveredEntry.routeCode)!.fill,
                border: "1.5px solid rgba(255,255,255,0.4)",
                backdropFilter: "blur(4px)",
              }}
            >
              {hoveredDbArea?.displayName || hoveredDbArea?.name || hoveredEntry.displayName}
            </div>
          )}

          {/* Guia "clique" quando via ativa mas nada selecionado */}
          {routeCode && !selectedAreaKey && activeColor && (
            <div
              className="absolute top-2 left-1/2 -translate-x-1/2 text-xs px-2.5 py-1 rounded-full pointer-events-none"
              style={{
                backgroundColor: `${activeColor.fill}22`,
                color: activeColor.stroke,
                border: `1px solid ${activeColor.fill}55`,
              }}
            >
              Clique em uma área {routeCode} para selecionar
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

function SvgAreaPath({ entry, style, onMouseEnter, onMouseLeave, onClick }: SvgAreaPathProps) {
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
