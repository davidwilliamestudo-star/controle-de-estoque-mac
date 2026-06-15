import { BODY_AREA_MAP, ROUTE_COLORS, type RouteCode } from "../constants/bodyAreaMap";
import { BODY_MAP_SVG_PATHS } from "../constants/bodyMapPaths";
import { BodyMapCanvas } from "./BodyMapCanvas";

interface ProcedureBodyMapPreviewProps {
  svgRegionId: string | null | undefined;
  routeCode?: string | null;
  size?: "sm" | "md" | "lg";
  bodyAreaName?: string | null;
}

/** Acesso null-safe ao ROUTE_COLORS */
function safeColor(code: string | null | undefined) {
  if (!code) return ROUTE_COLORS["EV"];
  const k = code.toUpperCase() as RouteCode;
  return ROUTE_COLORS[k] ?? ROUTE_COLORS["EV"];
}

export function ProcedureBodyMapPreview({
  svgRegionId,
  routeCode,
  size = "sm",
  bodyAreaName,
}: ProcedureBodyMapPreviewProps) {
  if (!svgRegionId) return null;

  const entry = BODY_AREA_MAP.find(e => e.svgId === svgRegionId);
  if (!entry) return null;

  const color = safeColor(routeCode || entry.routeCode);

  const containerClass = size === "sm" ? "w-28 flex-shrink-0" : size === "md" ? "w-48 flex-shrink-0" : "w-64 flex-shrink-0 mx-auto";

  return (
    <div className={containerClass} title={bodyAreaName || entry.displayName}>
      <BodyMapCanvas
        size="preview"
        className="!border-gray-100 rounded border" // Sobrescreve borda padrao via tailwind se necessario
        baseImageOpacity={0.65}
        baseImageStyle={{ filter: "grayscale(60%)" }}
        showDebug={false} // No preview, nunca mostramos a grade de debug
      >
        {/* Fundo apagado */}
        {Object.keys(BODY_MAP_SVG_PATHS)
          .filter(id => id !== svgRegionId)
          .map(id => (
            <path
              key={id}
              d={BODY_MAP_SVG_PATHS[id]}
              style={{ fill: color.fill, opacity: 0.07, pointerEvents: "none" }}
            />
          ))}
        {/* Destaque */}
        {BODY_MAP_SVG_PATHS[svgRegionId] && (
          <path
            d={BODY_MAP_SVG_PATHS[svgRegionId]}
            style={{
              fill: color.fill,
              opacity: 1,
              stroke: "#1A5347",
              strokeWidth: 2.5,
              strokeDasharray: "5 3",
              filter: "drop-shadow(0 0 5px rgba(26,83,71,0.35))",
              pointerEvents: "none",
            }}
          />
        )}
      </BodyMapCanvas>

      {size === "md" && (
        <p className="text-xs text-center mt-1 font-medium truncate" style={{ color: color.stroke }}>
          {bodyAreaName || entry.displayName}
        </p>
      )}
    </div>
  );
}
