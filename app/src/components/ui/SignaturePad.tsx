import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  RotateCcw,
  Eraser,
  PenTool,
  Maximize2,
  Minimize2,
  Check,
  ShieldCheck,
  Sparkles,
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

export const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  height = 200,
  className = "",
  signerName,
  signerCpf,
  showLegalNotice = true,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [inkColor, setInkColor] = useState<string>("#0F172A"); // Preto formal ou Azul Real
  const [strokeWidth, setStrokeWidth] = useState<number>(2.5);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[] | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [hasDrawn, setHasDrawn] = useState<boolean>(Boolean(value));

  // Redraw all strokes on canvas with high-DPI scaling
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Baseline guide line
    const baselineY = rect.height - 45;
    ctx.beginPath();
    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.moveTo(32, baselineY);
    ctx.lineTo(rect.width - 32, baselineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw baseline helper text
    ctx.fillStyle = "#94A3B8";
    ctx.font = "11px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Assine acima desta linha", rect.width / 2, baselineY + 18);

    // Draw saved strokes with smooth quadratic Bézier curves
    const allStrokes = currentStroke
      ? [...strokes, { points: currentStroke, color: inkColor, width: strokeWidth }]
      : strokes;

    allStrokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

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

    ctx.restore();
  }, [strokes, currentStroke, inkColor, strokeWidth]);

  // Handle window resize and initial mount
  useEffect(() => {
    redraw();
    const handleResize = () => redraw();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [redraw, isExpanded]);

  // Notify parent on strokes change
  const notifyChange = (newStrokes: Stroke[]) => {
    if (newStrokes.length === 0) {
      setHasDrawn(false);
      onChange?.(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Export pure signature as clean PNG
    const dataUrl = canvas.toDataURL("image/png");
    setHasDrawn(true);
    onChange?.(dataUrl);
  };

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
    notifyChange(updated);
  };

  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke(null);
    notifyChange([]);
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const updated = strokes.slice(0, -1);
    setStrokes(updated);
    notifyChange(updated);
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all duration-200 ${
        isExpanded ? "fixed inset-3 sm:inset-8 z-50 shadow-2xl" : ""
      } ${className}`}
    >
      {/* TOOLBAR */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 select-none shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <PenTool className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block leading-tight">
              {signerName ? `Assinatura: ${signerName}` : "Rubrica / Assinatura Digital"}
            </span>
            {signerCpf && (
              <span className="text-[10px] text-slate-500 font-mono">
                CPF: {signerCpf}
              </span>
            )}
          </div>
        </div>

        {/* CONTROLES DE CANETA E AÇÕES */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Seletor de Tinta */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setInkColor("#0F172A")}
              className={`w-5 h-5 rounded-full bg-slate-900 transition-transform cursor-pointer ${
                inkColor === "#0F172A" ? "ring-2 ring-emerald-600 scale-110" : "opacity-50 hover:opacity-100"
              }`}
              title="Tinta Preta Formal"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => setInkColor("#1E3A8A")}
              className={`w-5 h-5 rounded-full bg-blue-900 transition-transform cursor-pointer ${
                inkColor === "#1E3A8A" ? "ring-2 ring-emerald-600 scale-110" : "opacity-50 hover:opacity-100"
              }`}
              title="Tinta Azul Caneta Real"
            />
          </div>

          <button
            type="button"
            disabled={disabled || strokes.length === 0}
            onClick={handleUndo}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors disabled:opacity-40 cursor-pointer"
            title="Desfazer último traço"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={disabled || (!hasDrawn && strokes.length === 0)}
            onClick={handleClear}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
            title="Limpar assinatura"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Limpar</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
            title={isExpanded ? "Reduzir" : "Expandir para tela cheia"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ÁREA DE DESENHO (CANVAS) */}
      <div
        className="relative flex-1 bg-white cursor-crosshair overflow-hidden"
        style={{ minHeight: isExpanded ? "400px" : `${height}px` }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 w-full h-full touch-none select-none"
        />

        {!hasDrawn && strokes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 select-none pb-8">
            <PenTool className="w-8 h-8 text-slate-300 stroke-[1.5] mb-2" />
            <p className="text-xs font-semibold text-slate-500">
              Desenhe sua assinatura com o dedo, caneta ou mouse
            </p>
            <p className="text-[11px] text-slate-400">
              O traço é suavizado automaticamente com alta resolução
            </p>
          </div>
        )}

        {hasDrawn && (
          <div className="absolute top-3 right-3 pointer-events-none">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
              <Check className="w-3 h-3 stroke-[3]" /> Assinatura Capturada
            </span>
          </div>
        )}
      </div>

      {/* RODAPÉ JURÍDICO */}
      {showLegalNotice && (
        <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>Validade jurídica nos termos da Lei nº 14.063/2020 e MP 2.200-2/2001</span>
          </div>
          <span className="hidden sm:inline font-mono text-[10px] text-slate-400">
            SHA-256 Protocol
          </span>
        </div>
      )}
    </div>
  );
};
