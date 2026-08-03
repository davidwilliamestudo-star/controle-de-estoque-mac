/**
 * PdfViewerModal.tsx
 *
 * Modal de preview de documentos PDF.
 * Substituição completa do PdfViewerEngine.tsx:
 * - Barra superior horizontal (não sidebar lateral)
 * - Preview ocupa 100% da área disponível
 * - Controles acessíveis e com hierarquia clara
 * - Atalhos de teclado (Esc, Ctrl+D, Ctrl+E)
 */
import { ReactNode, useEffect, useRef } from "react";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import {
  X,
  Download,
  FileSpreadsheet,
  RotateCcw,
  FileText,
  Loader2,
} from "lucide-react";

interface PdfViewerModalProps {
  onClose: () => void;
  document: ReactNode;
  fileName?: string;
  reportTitle?: string;
  orientation?: "portrait" | "landscape";
  onOrientationChange?: (o: "portrait" | "landscape") => void;
  onExport?: () => void;
  isExporting?: boolean;
}

export function PdfViewerModal({
  onClose,
  document,
  fileName = "relatorio.pdf",
  reportTitle = "Visualizar Documento",
  orientation = "portrait",
  onOrientationChange,
  onExport,
  isExporting = false,
}: PdfViewerModalProps) {
  // Teclado
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "e" && onExport) {
        e.preventDefault();
        onExport();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onExport]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#1a1a1a]"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${reportTitle}`}
    >
      {/* ── TOPBAR ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#111] border-b border-white/10 shrink-0">
        {/* Título */}
        <div className="flex items-center gap-2 mr-auto min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <FileText size={14} className="text-white/70" />
          </div>
          <span className="text-sm font-medium text-white/90 truncate">{reportTitle}</span>
          <span className="text-xs text-white/30 shrink-0">·</span>
          <span className="text-xs text-white/40 shrink-0">PDF Preview</span>
        </div>

        {/* Orientação */}
        {onOrientationChange && (
          <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10 shrink-0">
            <button
              onClick={() => onOrientationChange("portrait")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                orientation === "portrait"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-white/50 hover:text-white/80"
              }`}
              title="Retrato A4"
            >
              Retrato
            </button>
            <button
              onClick={() => onOrientationChange("landscape")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                orientation === "landscape"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-white/50 hover:text-white/80"
              }`}
              title="Paisagem A4"
            >
              Paisagem
            </button>
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Exportar CSV */}
          {onExport && (
            <button
              onClick={onExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all border border-white/10 disabled:opacity-40"
              title="Exportar para CSV (Ctrl + E)"
            >
              {isExporting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <FileSpreadsheet size={13} />
              )}
              {isExporting ? "Exportando..." : "CSV"}
            </button>
          )}

          {/* Baixar PDF */}
          <PDFDownloadLink
            document={document as any}
            fileName={fileName}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#1A5347] hover:bg-[#256b5d] rounded-lg transition-all border border-[#1A5347]"
            title="Baixar PDF (Ctrl + D)"
          >
            {/* @ts-ignore */}
            {({ loading }) => (
              <>
                {loading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Download size={13} />
                )}
                {loading ? "Gerando..." : "Baixar PDF"}
              </>
            )}
          </PDFDownloadLink>

          {/* Separador */}
          <div className="w-px h-5 bg-white/10 mx-1" />

          {/* Fechar */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            title="Fechar preview (Esc)"
          >
            <X size={14} />
            Fechar
          </button>
        </div>
      </div>

      {/* ── PDF VIEWER (100% do espaço restante) ────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <PDFViewer
          className="w-full h-full border-none"
          showToolbar={true}
          style={{ backgroundColor: "#1a1a1a" }}
        >
          {document as any}
        </PDFViewer>
      </div>

      {/* Oculta scroll do body enquanto modal está aberto */}
      <style>{`body { overflow: hidden; }`}</style>
    </div>
  );
}

// Manter compatibilidade com nome antigo
export { PdfViewerModal as PdfViewerEngine };
