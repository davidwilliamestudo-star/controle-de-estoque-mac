import React from "react";
import {
  BODY_MAP_BASE_SIZE,
  BODY_MAP_PATH_TRANSFORM,
} from "../constants/bodyMapCalibration";

interface BodyMapCanvasProps {
  children: React.ReactNode;
  className?: string;
  size?: "full" | "preview";
  baseImageOpacity?: number;
  baseImageStyle?: React.CSSProperties;
  showDebug?: boolean;
  transformOverride?: {
    translateX: number;
    translateY: number;
    scaleX: number;
    scaleY: number;
  } | null;
}

export function BodyMapCanvas({
  children,
  className = "",
  size = "full",
  baseImageOpacity = 1,
  baseImageStyle = {},
  showDebug = false,
  transformOverride = null,
}: BodyMapCanvasProps) {
  const transform = transformOverride || BODY_MAP_PATH_TRANSFORM;
  const { translateX, translateY, scaleX, scaleY } = transform;

  return (
    <div
      className={`relative w-full mx-auto bg-gray-50 flex items-center justify-center overflow-hidden ${className}`}
      style={{
        maxWidth: size === "preview" ? "220px" : "100%",
        aspectRatio: `${BODY_MAP_BASE_SIZE.width} / ${BODY_MAP_BASE_SIZE.height}`,
      }}
    >
      {/* Imagem base preenchendo o container exato 1792x2400 proporcionalmente */}
      <img
        src="/body-map-base.png.jpeg"
        alt="Mapa corporal"
        className="absolute inset-0 h-full w-full object-contain"
        draggable={false}
        style={{
          opacity: baseImageOpacity,
          userSelect: "none",
          pointerEvents: "none",
          ...baseImageStyle,
        }}
      />

      {/* SVG Externo 1792x2400 */}
      <svg
        viewBox={`0 0 ${BODY_MAP_BASE_SIZE.width} ${BODY_MAP_BASE_SIZE.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full block"
      >
        {showDebug && (
          <rect
            x="0"
            y="0"
            width={BODY_MAP_BASE_SIZE.width}
            height={BODY_MAP_BASE_SIZE.height}
            fill="none"
            stroke="red"
            strokeWidth="4"
            strokeDasharray="10 10"
          />
        )}

        {/* Grupo de transformação (paths originais) */}
        <g transform={`translate(${translateX} ${translateY}) scale(${scaleX} ${scaleY})`}>
          {children}
        </g>
      </svg>
    </div>
  );
}
