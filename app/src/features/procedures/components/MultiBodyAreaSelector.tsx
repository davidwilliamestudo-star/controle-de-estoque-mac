import { useState, useMemo, useRef, useEffect } from "react";
import {
  Info,
  MapPin,
  X,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Move,
} from "lucide-react";
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
  /** Largura da coluna expandida na página */
  isColumnExpanded?: boolean;
  /** Alterna largura da coluna entre normal e expandida */
  onToggleExpandColumn?: () => void;
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

export function MultiBodyAreaSelector({
  selectedBodyAreaIds,
  bodyAreas,
  activeRouteCode,
  onAreaClick,
  isColumnExpanded = false,
  onToggleExpandColumn,
}: MultiBodyAreaSelectorProps) {
  const [hoveredSvgId, setHoveredSvgId] = useState<string | null>(null);
  const [debugTransform] = useState({ ...BODY_MAP_PATH_TRANSFORM });

  // Zoom e Pan inline
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Modal Expandido em Tela Cheia
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalZoom, setModalZoom] = useState(1.1);
  const [modalPan, setModalPan] = useState({ x: 0, y: 0 });

  // Filtros e Busca de Áreas
  const [filterRoute, setFilterRoute] = useState<"ALL" | RouteCode>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [isQuickListOpen, setIsQuickListOpen] = useState(false);

  // Fecha modal com Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

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

    const routeColor = rc(entry.routeCode);
    const activeFill = routeColor?.fill ?? "#6b7280";
    const activeStroke = routeColor?.stroke ?? "#374151";

    if (active) {
      return {
        fill: activeFill,
        opacity: isHovered ? 1 : 0.88,
        stroke: activeStroke,
        strokeWidth: isHovered ? 3.5 : 2.5,
        strokeDasharray: "8 5",
        filter: "drop-shadow(0 0 8px rgba(0,0,0,0.3))",
        cursor: "pointer",
        transition: "all 0.15s ease",
      };
    }

    if (isHovered) {
      return {
        fill: activeFill,
        opacity: 0.65,
        stroke: activeStroke,
        strokeWidth: 2.5,
        cursor: "pointer",
        transition: "all 0.1s ease",
      };
    }

    let baseOpacity = 0.22;
    if (activeRouteCode) {
      if (entry.routeCode === activeRouteCode) {
        baseOpacity = 0.7;
      } else {
        baseOpacity = 0.05;
      }
    }

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

  // Áreas filtradas para lista rápida e modal
  const filteredAreas = useMemo(() => {
    return BODY_AREA_MAP.filter((entry) => {
      if (filterRoute !== "ALL" && entry.routeCode !== filterRoute) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const dbArea = findDbArea(entry.areaKey);
        const name = (dbArea?.displayName || dbArea?.name || entry.displayName).toLowerCase();
        return name.includes(term);
      }
      return true;
    });
  }, [filterRoute, searchTerm, bodyAreas]);

  // Controles de zoom
  const handleZoomIn = () => setZoom((z) => Math.min(2.5, Number((z + 0.3).toFixed(1))));
  const handleZoomOut = () => {
    setZoom((z) => {
      const next = Math.max(1, Number((z - 0.3).toFixed(1)));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  };
  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="flex flex-col gap-2.5 w-full h-full">
      {/* Barra Superior: Ferramentas de Expansão e Zoom */}
      <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-gray-100 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            {activeEntries.length} área(s) selecionada(s)
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onToggleExpandColumn && (
            <button
              type="button"
              onClick={onToggleExpandColumn}
              className={`btn btn-ghost btn-sm px-2 py-1 text-xs font-semibold flex items-center gap-1 rounded-lg border transition-all ${
                isColumnExpanded
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
              title={isColumnExpanded ? "Recolher largura da coluna" : "Expandir largura da coluna para selecionar melhor"}
            >
              {isColumnExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span className="hidden sm:inline">{isColumnExpanded ? "Reduzir Coluna" : "Expandir Coluna"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary btn-sm px-2.5 py-1 text-xs font-bold flex items-center gap-1 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white shadow-2xs border-transparent"
            title="Abrir mapa em tela cheia com alta resolução e lista lateral"
          >
            <Maximize2 size={13} />
            <span>Tela Cheia</span>
          </button>
        </div>
      </div>

      {/* Legenda das áreas ativas */}
      {activeEntries.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1 bg-gray-50/60 rounded-lg border border-gray-100">
          {activeEntries.map((entry) => {
            const dbArea = findDbArea(entry.areaKey);
            const count = dbArea ? (activeCounts.get(dbArea.id) ?? 0) : 0;
            const color = rc(entry.routeCode);
            return (
              <button
                key={entry.svgId}
                type="button"
                onClick={() => handleClick(entry)}
                className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer hover:opacity-85 transition-opacity"
                style={{
                  background: color ? `${color.fill}18` : "#f3f4f6",
                  color: color?.stroke ?? "#374151",
                  border: `1.5px solid ${color?.fill ?? "#d1d5db"}`,
                }}
                title="Clique para adicionar mais uma aplicação nesta área"
              >
                <MapPin size={10} />
                <span>{dbArea?.displayName || dbArea?.name || entry.displayName}</span>
                {count > 1 && (
                  <span
                    className="ml-0.5 rounded-full px-1 text-white text-[10px] font-bold"
                    style={{ background: color?.fill ?? "#6b7280" }}
                  >
                    ×{count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-dashed"
          style={{ backgroundColor: "var(--color-gray-50)", color: "var(--color-gray-500)" }}
        >
          <Info size={13} className="shrink-0 text-emerald-700" />
          <span>Clique nas regiões do corpo ou use a lista rápida abaixo.</span>
        </div>
      )}

      {/* Container do mapa interativo com suporte a zoom & pan */}
      <div
        className="relative w-full flex-1 select-none rounded-xl overflow-hidden border flex items-center justify-center bg-gray-50"
        style={{
          borderColor: "var(--color-gray-200)",
          backgroundColor: "#f8f9fa",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)",
          minHeight: isColumnExpanded ? "520px" : "440px",
          cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Controles Flutuantes de Zoom no Canto Superior Direito */}
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-white/90 backdrop-blur-xs p-1 rounded-lg border border-gray-200 shadow-sm">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            className="p-1 rounded hover:bg-gray-100 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Diminuir Zoom"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[11px] font-bold text-gray-600 px-1 min-w-[36px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 2.5}
            className="p-1 rounded hover:bg-gray-100 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Aumentar Zoom (Melhor para mãos, veias e cintura)"
          >
            <ZoomIn size={14} />
          </button>
          {zoom > 1 && (
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1 rounded hover:bg-gray-100 text-gray-700 border-l border-gray-200 ml-0.5"
              title="Redefinir Zoom e Posição"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>

        {/* Indicador de arrasto quando ampliado */}
        {zoom > 1 && (
          <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full pointer-events-none">
            <Move size={10} />
            <span>Arraste para mover o mapa</span>
          </div>
        )}

        <BodyMapCanvas
          showDebug={SHOW_BODY_MAP_DEBUG}
          zoom={zoom}
          pan={pan}
          size={isColumnExpanded ? "expanded" : "full"}
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
              className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-white px-3 py-1.5 rounded-full shadow-lg pointer-events-none z-30"
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
                <span className="ml-1 opacity-80">· já selecionada (clique para nova aplicação)</span>
              )}
            </div>
          )}
        </BodyMapCanvas>
      </div>

      {/* Accordion / Seletor Rápido por Lista de Áreas */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        <button
          type="button"
          onClick={() => setIsQuickListOpen((v) => !v)}
          className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-xs font-semibold text-gray-700 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Layers size={13} className="text-emerald-700" />
            <span>Selecionar por Lista / Busca ({BODY_AREA_MAP.length} regiões)</span>
          </span>
          {isQuickListOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {isQuickListOpen && (
          <div className="p-3 space-y-2.5 border-t border-gray-100 bg-white">
            {/* Campo de Busca Rápida */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar área (ex: glúteo, barriga, braço, coxa)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-control text-xs pl-8 py-1.5 w-full rounded-lg bg-gray-50 border-gray-200"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Abas de Filtragem por Via */}
            <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterRoute("ALL")}
                className={`px-2 py-0.5 rounded-md font-semibold transition-colors shrink-0 ${
                  filterRoute === "ALL"
                    ? "bg-slate-800 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Todas (22)
              </button>
              <button
                type="button"
                onClick={() => setFilterRoute("SC")}
                className={`px-2 py-0.5 rounded-md font-semibold transition-colors shrink-0 flex items-center gap-1 ${
                  filterRoute === "SC"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Subcutânea (10)
              </button>
              <button
                type="button"
                onClick={() => setFilterRoute("IM")}
                className={`px-2 py-0.5 rounded-md font-semibold transition-colors shrink-0 flex items-center gap-1 ${
                  filterRoute === "IM"
                    ? "bg-emerald-700 text-white"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Intramuscular (6)
              </button>
              <button
                type="button"
                onClick={() => setFilterRoute("EV")}
                className={`px-2 py-0.5 rounded-md font-semibold transition-colors shrink-0 flex items-center gap-1 ${
                  filterRoute === "EV"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-50 text-blue-800 hover:bg-blue-100"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Endovenosa (6)
              </button>
            </div>

            {/* Chips Clicáveis de Áreas */}
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pt-1">
              {filteredAreas.map((entry) => {
                const dbArea = findDbArea(entry.areaKey);
                const active = isActive(entry);
                const count = dbArea ? (activeCounts.get(dbArea.id) ?? 0) : 0;
                const color = rc(entry.routeCode);
                const isHovered = hoveredSvgId === entry.svgId;

                return (
                  <button
                    key={entry.svgId}
                    type="button"
                    onClick={() => handleClick(entry)}
                    onMouseEnter={() => setHoveredSvgId(entry.svgId)}
                    onMouseLeave={() => setHoveredSvgId(null)}
                    className={`text-left p-1.5 rounded-lg border text-xs font-medium flex items-center justify-between gap-1 transition-all ${
                      active
                        ? "bg-emerald-50/80 border-emerald-400 text-emerald-950 font-bold shadow-2xs"
                        : isHovered
                        ? "bg-blue-50 border-blue-300 text-blue-900"
                        : "bg-gray-50/60 border-gray-200 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span className="truncate flex items-center gap-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: color?.fill ?? "#9ca3af" }}
                      ></span>
                      <span className="truncate">{dbArea?.displayName || dbArea?.name || entry.displayName}</span>
                    </span>

                    {count > 0 && (
                      <span className="shrink-0 px-1 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                        ✓ {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL EM TELA CHEIA PARA SELEÇÃO EXPANDIDA ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200">
            {/* Cabeçalho do Modal */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-emerald-100 text-emerald-800">
                    <Sparkles size={16} />
                  </span>
                  <h3 className="text-lg font-bold text-gray-900">
                    Mapa Corporal Anatômico — Seleção Expandida
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                    Alta Resolução
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Clique diretamente nas áreas anatômicas ampliadas ou utilize a lista lateral com busca e filtros por via.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                >
                  <X size={16} />
                  <span>Fechar</span>
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal (Duas Colunas: Mapa Gigante + Lista Lateral) */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
              {/* Coluna Esquerda: Canvas Ampliado */}
              <div
                className="flex-1 bg-gray-100 relative overflow-hidden flex items-center justify-center p-4 select-none"
                style={{
                  minHeight: "560px",
                  cursor: modalZoom > 1 ? "grab" : "default",
                }}
              >
                {/* Controles de Zoom do Modal */}
                <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-xs p-1.5 rounded-xl border border-gray-200 shadow-md">
                  <button
                    type="button"
                    onClick={() => setModalZoom((z) => Math.max(0.9, Number((z - 0.2).toFixed(1))))}
                    disabled={modalZoom <= 0.9}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-700 disabled:opacity-30"
                    title="Diminuir Zoom"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span className="text-xs font-bold text-gray-700 px-2 min-w-[42px] text-center">
                    {Math.round(modalZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalZoom((z) => Math.min(3, Number((z + 0.2).toFixed(1))))}
                    disabled={modalZoom >= 3}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-700 disabled:opacity-30"
                    title="Aumentar Zoom"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalZoom(1.1);
                      setModalPan({ x: 0, y: 0 });
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-700 border-l border-gray-200 ml-1"
                    title="Redefinir Zoom"
                  >
                    <RotateCcw size={15} />
                  </button>
                </div>

                <div className="w-full max-w-[780px] h-full flex items-center justify-center">
                  <BodyMapCanvas
                    showDebug={SHOW_BODY_MAP_DEBUG}
                    zoom={modalZoom}
                    pan={modalPan}
                    size="expanded"
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

                    {/* Tooltip do Modal */}
                    {hoveredEntry && (
                      <div
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm font-semibold text-white px-4 py-2 rounded-full shadow-2xl pointer-events-none z-30"
                        style={{
                          backgroundColor: rc(hoveredEntry.routeCode)?.fill ?? "#374151",
                          border: "2px solid rgba(255,255,255,0.5)",
                          backdropFilter: "blur(6px)",
                        }}
                      >
                        {hoveredDbArea?.displayName ||
                          hoveredDbArea?.name ||
                          hoveredEntry.displayName}
                        <span className="ml-2 text-xs opacity-85">· Clique para selecionar</span>
                      </div>
                    )}
                  </BodyMapCanvas>
                </div>
              </div>

              {/* Coluna Direita do Modal: Lista e Filtros */}
              <div className="w-full md:w-[360px] border-l border-gray-200 bg-white flex flex-col p-4 space-y-3 shrink-0">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Seletor por Lista ({BODY_AREA_MAP.length} Áreas)
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Clique em qualquer item para vincular a uma aplicação.
                  </p>
                </div>

                {/* Busca */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filtrar área corporal..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-control text-xs pl-9 py-2 w-full rounded-xl bg-gray-50 border-gray-200"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Filtro por Via */}
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterRoute("ALL")}
                    className={`py-1.5 px-2 rounded-lg font-bold text-center transition-colors ${
                      filterRoute === "ALL"
                        ? "bg-slate-800 text-white shadow-2xs"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Todas (22)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterRoute("SC")}
                    className={`py-1.5 px-2 rounded-lg font-bold text-center transition-colors flex items-center justify-center gap-1 ${
                      filterRoute === "SC"
                        ? "bg-amber-600 text-white shadow-2xs"
                        : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Subcutânea
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterRoute("IM")}
                    className={`py-1.5 px-2 rounded-lg font-bold text-center transition-colors flex items-center justify-center gap-1 ${
                      filterRoute === "IM"
                        ? "bg-emerald-700 text-white shadow-2xs"
                        : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Intramuscular
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterRoute("EV")}
                    className={`py-1.5 px-2 rounded-lg font-bold text-center transition-colors flex items-center justify-center gap-1 ${
                      filterRoute === "EV"
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-blue-50 text-blue-800 hover:bg-blue-100"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Endovenosa
                  </button>
                </div>

                {/* Lista Completa com Scroll */}
                <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
                  {filteredAreas.map((entry) => {
                    const dbArea = findDbArea(entry.areaKey);
                    const active = isActive(entry);
                    const count = dbArea ? (activeCounts.get(dbArea.id) ?? 0) : 0;
                    const color = rc(entry.routeCode);
                    const isHovered = hoveredSvgId === entry.svgId;

                    return (
                      <button
                        key={entry.svgId}
                        type="button"
                        onClick={() => handleClick(entry)}
                        onMouseEnter={() => setHoveredSvgId(entry.svgId)}
                        onMouseLeave={() => setHoveredSvgId(null)}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          active
                            ? "bg-emerald-50 border-emerald-400 text-emerald-950 shadow-2xs"
                            : isHovered
                            ? "bg-blue-50 border-blue-400 text-blue-950 shadow-2xs"
                            : "bg-gray-50/70 border-gray-200 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: color?.fill ?? "#9ca3af" }}
                          ></span>
                          <span className="truncate">{dbArea?.displayName || dbArea?.name || entry.displayName}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80 border border-gray-200 text-gray-600">
                            {entry.routeCode}
                          </span>
                          {count > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                              ✓ {count}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Rodapé do Modal */}
                <div className="pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="w-full btn btn-primary py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm"
                  >
                    <Check size={16} />
                    <span>Concluir Seleção ({activeEntries.length} áreas)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
