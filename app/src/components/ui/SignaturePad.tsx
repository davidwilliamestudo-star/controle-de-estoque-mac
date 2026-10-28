import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  RotateCcw,
  Eraser,
  PenTool,
  Maximize2,
  Minimize2,
  Check,
  ShieldCheck,
} from "lucide-react";

export interface SignaturePadProps {
  value?: string | null;
  onChange?: (dataUrl: string | null) => void;
  height?: number;
  className?: string;
  signerName?: string;
  signerCpf?: string;
  showLegalNotice?: boolean;
  disabled?: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

function drawStrokesOnContext(
  ctx: CanvasRenderingContext2D,
  strokesToDraw: Stroke[]
) {
  strokesToDraw.forEach((stroke) => {
    if (stroke.points.length === 0) return;

    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.points.length === 1) {
      ctx.beginPath();
      ctx.arc(
        stroke.points[0].x,
        stroke.points[0].y,
        stroke.width / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let i = 1; i < stroke.points.length - 1; i++) {
      const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
      const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
      ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
    }

    const lastPoint = stroke.points[stroke.points.length - 1];
    ctx.lineTo(lastPoint.x, lastPoint.y);
    ctx.stroke();
  });
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  height = 220,
  className = "",
  signerName,
  signerCpf,
  showLegalNotice = true,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [inkColor, setInkColor] = useState<string>("#0F172A");
  const [strokeWidth, setStrokeWidth] = useState<number>(2.6);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[] | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [hasDrawn, setHasDrawn] = useState<boolean>(Boolean(value));

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const allStrokes = currentStroke
      ? [...strokes, { points: currentStroke, color: inkColor, width: strokeWidth }]
      : strokes;

    drawStrokesOnContext(ctx, allStrokes);
    ctx.restore();
  }, [strokes, currentStroke, inkColor, strokeWidth]);

  useEffect(() => {
    redraw();
    const handleResize = () => redraw();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [redraw, isExpanded]);

  const exportCleanPng = useCallback((updatedStrokes: Stroke[]) => {
    if (updatedStrokes.length === 0) {
      setHasDrawn(false);
      onChange?.(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(Math.round(rect.width), 320);
    const exportHeight = Math.max(Math.round(rect.height), 180);
    const exportScale = 2;

    const offscreen = document.createElement("canvas");
    offscreen.width = width * exportScale;
    offscreen.height = exportHeight * exportScale;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return;

    offCtx.scale(exportScale, exportScale);
    drawStrokesOnContext(offCtx, updatedStrokes);

    const dataUrl = offscreen.toDataURL("image/png");
    setHasDrawn(true);
    onChange?.(dataUrl);
  }, [onChange]);

  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = getCanvasCoordinates(e);
    setCurrentStroke([point]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentStroke || disabled) return;
    const point = getCanvasCoordinates(e);
    setCurrentStroke((prev) => (prev ? [...prev, point] : [point]));
  };

  const handlePointerUp = () => {
    if (!currentStroke || disabled) return;
    const completedStroke: Stroke = {
      points: currentStroke,
      color: inkColor,
      width: strokeWidth,
    };
    const updated = [...strokes, completedStroke];
    setStrokes(updated);
    setCurrentStroke(null);
    exportCleanPng(updated);
  };

  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke(null);
    exportCleanPng([]);
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const updated = strokes.slice(0, -1);
    setStrokes(updated);
    exportCleanPng(updated);
  };

  const padContent = (
    <div
      ref={containerRef}
      className={`flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden transition-all duration-200 ${
        isExpanded
          ? "w-full max-w-3xl h-[82dvh] max-h-[620px] shadow-2xl ring-1 ring-white/20"
          : ""
      } ${className}`}
    >
      {/* BARRA DE FERRAMENTAS ERGONÔMICA */}
      <div className="px-4 sm:px-5 py-3 bg-slate-50/90 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 select-none shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-100/80 border border-emerald-200/70 text-emerald-800 flex items-center justify-center shrink-0">
            <PenTool className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs sm:text-[13px] font-bold text-slate-900 block truncate leading-tight">
              {signerName ? signerName : "Rubrica / Assinatura Digital"}
            </span>
            {signerCpf ? (
              <span className="text-[11px] text-slate-500 font-mono">
                CPF: {signerCpf}
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">
                Traço vetorial de alta definição
              </span>
            )}
          </div>
        </div>

        {/* CONTROLES DE TINTA, ESPESSURA E AÇÕES */}
        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
          {/* Seletor de Cor da Caneta */}
          <div
            className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-2xs"
            title="Cor da tinta"
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => setInkColor("#0F172A")}
              className={`w-5 h-5 rounded-full bg-slate-900 transition-all cursor-pointer ${
                inkColor === "#0F172A"
                  ? "ring-2 ring-offset-1 ring-emerald-600 scale-105"
                  : "opacity-45 hover:opacity-90"
              }`}
              title="Tinta Preta Oficial"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => setInkColor("#1E3A8A")}
              className={`w-5 h-5 rounded-full bg-blue-900 transition-all cursor-pointer ${
                inkColor === "#1E3A8A"
                  ? "ring-2 ring-offset-1 ring-emerald-600 scale-105"
                  : "opacity-45 hover:opacity-90"
              }`}
              title="Tinta Azul Caneta Real"
            />
          </div>

          {/* Seletor de Espessura */}
          <div className="hidden sm:flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            {[
              { label: "Fina", w: 1.9 },
              { label: "Média", w: 2.6 },
              { label: "Forte", w: 3.5 },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                disabled={disabled}
                onClick={() => setStrokeWidth(opt.w)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  strokeWidth === opt.w
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={disabled || strokes.length === 0}
            onClick={handleUndo}
            className="h-8.5 w-8.5 inline-flex items-center justify-center text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
            title="Desfazer último traço"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={disabled || (!hasDrawn && strokes.length === 0)}
            onClick={handleClear}
            className="h-8.5 inline-flex items-center gap-1.5 px-3 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
            title="Limpar assinatura"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8.5 w-8.5 inline-flex items-center justify-center text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer shadow-2xs"
            title={isExpanded ? "Sair da tela ampliada" : "Ampliar área de assinatura"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ÁREA DE DESENHO COM GUIA VISUAL EM HTML (NÃO CONTAMINA O PNG EXPORTADO) */}
      <div
        className="relative flex-1 bg-white cursor-crosshair overflow-hidden"
        style={{
          minHeight: isExpanded ? "320px" : `${height}px`,
          backgroundImage:
            "radial-gradient(rgba(148, 163, 184, 0.22) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      >
        {/* Linha-guia de assinatura puramente visual */}
        <div className="absolute inset-x-6 sm:inset-x-10 bottom-11 pointer-events-none select-none flex flex-col items-center">
          <div className="w-full border-b border-dashed border-slate-300" />
          <span className="text-[11px] font-medium text-slate-400 mt-1.5 tracking-wide">
            Assine acima desta linha
          </span>
        </div>

        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 w-full h-full touch-none select-none z-10"
        />

        {!hasDrawn && strokes.length === 0 && !currentStroke && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 select-none pb-8 px-4 text-center">
            <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center mb-2.5 shadow-2xs">
              <PenTool className="w-5 h-5 text-emerald-600/80 stroke-[1.75]" />
            </div>
            <p className="text-xs sm:text-[13px] font-semibold text-slate-600">
              Desenhe sua assinatura ou rubrica aqui
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Use o dedo na tela sensível ao toque, caneta stylus ou mouse
            </p>
          </div>
        )}

        {hasDrawn && (
          <div className="absolute top-3 right-3 pointer-events-none z-20">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50/95 backdrop-blur-xs px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
              <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
              Assinatura pronta
            </span>
          </div>
        )}
      </div>

      {/* RODAPÉ DO QUADRO */}
      {(showLegalNotice || isExpanded) && (
        <div className="px-4 sm:px-5 py-2.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-3 text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="truncate">
              Validade jurídica conforme Lei nº 14.063/2020 e MP 2.200-2/2001
            </span>
          </div>

          {isExpanded ? (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer shrink-0 shadow-xs"
            >
              Concluir Traço
            </button>
          ) : (
            <span className="hidden sm:inline font-mono text-[10px] text-slate-400 shrink-0">
              SHA-256 • Alta Resolução
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs p-3 sm:p-6 md:p-10 flex items-center justify-center">
        {padContent}
      </div>
    );
  }

  return padContent;
};
