/**
 * ReportsPage.tsx — Centro de Documentos Profissional
 *
 * Arquitetura corrigida:
 * 1. Dados buscados FORA do componente PDF (via useReportData)
 * 2. Documentos PDF recebem `data` como props (sem hooks internos)
 * 3. Estado limpo: selectedType + filter → gera preview quando solicitado
 * 4. Preview modal fullscreen com topbar horizontal
 */
import { useState, useCallback, useEffect, useMemo } from "react";
import {
  FileText,
  Printer,
  Download,
  RotateCcw,
  RefreshCw,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Clock,
  Activity,
  X,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

import { ReportSidebar, reportGroups } from "../components/ReportSidebar";
import { ReportFilterPanel, ActiveFilterPills, FavoritesPanel } from "../components/ReportFilterPanel";
import { PdfViewerEngine } from "../pdf";
import { reportsService } from "../services/reports.service";
import { useReportData, useDashboardKPIs, REPORTS_QUERY_KEY } from "../hooks/useReportData";

import type { ReportFilter, ReportType } from "../schemas/report.schema";

// Documentos PDF (recebem data como props)
import { StockPositionDocument } from "../components/reports/StockPositionReport";
import { StockMovementsDocument } from "../components/reports/StockMovementsReport";
import { ConsumptionDocument } from "../components/reports/ConsumptionReport";
import { TraceabilityDocument } from "../components/reports/TraceabilityReport";
import { PatientHistoryDocument } from "../components/reports/PatientHistoryReport";
import { PatientGeneralDocument } from "../components/reports/PatientGeneralReport";
import { DetailedOperationalDocument } from "../components/reports/DetailedOperationalReport";

type ConcreteReportType = Exclude<ReportType, null>;

// Relatórios que devem gerar em modo paisagem por padrão
const LANDSCAPE_REPORTS: ConcreteReportType[] = [
  "stock_position", "stock_movements", "stock_consumption", "audit_log",
  "labels_generated", "top_consumed", "stock_forecasting", "patient_history",
  "patient_evolutions", "patient_medications", "patient_materials",
  "patient_batches", "patient_body_areas", "stock_low", "stock_expirations",
  "stock_expired", "stock_entries", "stock_exits", "batch_by_item",
  "patients_by_batch", "protocols_list", "protocol_procedures",
];

function defaultFilter(): ReportFilter {
  return {
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    batchNumber: "",
    categoryId: "",
    itemType: "",
    movementType: "all",
    medicationId: "",
    materialId: "",
    supplierId: "",
    userId: "",
  };
}

// ─── KPI Card Component ───────────────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  label,
  value,
  subtext,
  tone = "neutral",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const tones = {
    neutral: {
      card: { backgroundColor: "#FFFFFF", borderColor: "#E8E0D2", borderLeftColor: "#1A5347" },
      icon: { backgroundColor: "#F7F4EE", color: "#1A5347" },
      value: "#111827",
    },
    success: {
      card: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0", borderLeftColor: "#16A34A" },
      icon: { backgroundColor: "#DCFCE7", color: "#15803D" },
      value: "#14532D",
    },
    warning: {
      card: { backgroundColor: "#FFFBEB", borderColor: "#FDE68A", borderLeftColor: "#D97706" },
      icon: { backgroundColor: "#FEF3C7", color: "#B45309" },
      value: "#92400E",
    },
    danger: {
      card: { backgroundColor: "#FEF2F2", borderColor: "#FECACA", borderLeftColor: "#DC2626" },
      icon: { backgroundColor: "#FEE2E2", color: "#B91C1C" },
      value: "#7F1D1D",
    },
  } as const;
  const t = tones[tone];

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-l-[5px] shadow-sm"
      style={t.card}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
        style={t.icon}
      >
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p
          className="text-xs font-semibold leading-none mb-1.5"
          style={{ color: "#8C7A6B" }}
        >
          {label}
        </p>
        <p className="text-2xl font-bold leading-none tracking-tight" style={{ color: t.value }}>
          {value}
        </p>
        {subtext && (
          <p className="text-xs mt-1.5 font-medium" style={{ color: "#9CA3AF" }}>
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Render do documento PDF (com dados já prontos) ──────────────────────────
function renderDocument(
  reportType: ConcreteReportType,
  data: unknown,
  filter: ReportFilter,
  orientation: "portrait" | "landscape"
) {
  switch (reportType) {
    case "stock_position":
      return <StockPositionDocument data={(data as any) || []} filter={filter} orientation={orientation} />;
    case "stock_movements":
      return <StockMovementsDocument data={(data as any) || []} filter={filter} orientation={orientation} />;
    case "stock_consumption":
      return <ConsumptionDocument data={(data as any) || []} filter={filter} orientation={orientation} />;
    case "patients_by_batch":
      return <TraceabilityDocument data={(data as any) || []} batchNumber={filter.batchNumber || ""} orientation={orientation} />;
    case "patient_history":
      return <PatientHistoryDocument data={(data as any) || []} filter={filter} orientation={orientation} />;
    case "patient_general":
      return <PatientGeneralDocument data={(data as any) || null} patientId={filter.patientId} orientation={orientation} />;
    default:
      return <DetailedOperationalDocument data={(data as any) || null} filter={filter} orientation={orientation} />;
  }
}

// ─── ReportsPage ─────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ReportType>(null);
  const [filter, setFilter] = useState<ReportFilter>(defaultFilter);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // FIX: estado de erro de export para feedback visual ao usuário
  const [exportError, setExportError] = useState<string | null>(null);

  // ─── Busca dados prontos (FORA do componente PDF) ─────────────────────
  const { data: reportData, isLoading: isDataLoading } = useReportData(selectedType, filter);

  // ─── KPIs do dashboard ────────────────────────────────────────────────
  const { data: kpis } = useDashboardKPIs();

  // ─── Metadados do relatório selecionado ───────────────────────────────
  const selectedReport = useMemo(
    () => reportGroups.flatMap(g => g.reports).find(r => r.id === selectedType),
    [selectedType]
  );

  // FIX: localStorage versionado para evitar conflito quando schema de ReportFilter mudar
  const FILTER_STORAGE_VERSION = "v2";

  // Restaurar último filtro do relatório selecionado
  useEffect(() => {
    if (!selectedType) return;
    const saved = localStorage.getItem(`voltq_filter_${FILTER_STORAGE_VERSION}_${selectedType}`);
    if (saved) {
      try { setFilter(JSON.parse(saved)); } catch {
        localStorage.removeItem(`voltq_filter_${FILTER_STORAGE_VERSION}_${selectedType}`);
      }
    } else {
      setFilter(defaultFilter());
    }
  }, [selectedType]);

  // Persistir filtro ao mudar
  useEffect(() => {
    if (selectedType && filter) {
      localStorage.setItem(`voltq_filter_${FILTER_STORAGE_VERSION}_${selectedType}`, JSON.stringify(filter));
    }
  }, [filter, selectedType]);

  // Atalhos de teclado globais
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedType) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "Enter") { e.preventDefault(); handleGenerate(); }
        if (e.key.toLowerCase() === "e") { e.preventDefault(); handleExport(); }
        if (e.key.toLowerCase() === "l") { e.preventDefault(); handleClear(); }
        if (e.key.toLowerCase() === "r") { e.preventDefault(); handleRefresh(); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedType, filter, isPreviewOpen]);

  const handleSelectReport = useCallback((type: ConcreteReportType) => {
    setSelectedType(type);
    setIsPreviewOpen(false);
    // Orientação baseada no tipo
    setOrientation(LANDSCAPE_REPORTS.includes(type) ? "landscape" : "portrait");
  }, []);

  const handleGenerate = useCallback(() => {
    if (!selectedType) return;
    setIsPreviewOpen(true);
  }, [selectedType]);

  const handleClear = useCallback(() => {
    setFilter(defaultFilter());
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: REPORTS_QUERY_KEY });
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  const handleExport = useCallback(async () => {
    if (!selectedType) return;
    setIsExporting(true);
    setExportError(null);
    try {
      await reportsService.exportReport(selectedType, filter);
    } catch (e) {
      // FIX: feedback visual de erro de export em vez de console.error silencioso
      const msg = e instanceof Error ? e.message : "Falha ao exportar o relatório. Tente novamente.";
      setExportError(msg);
      console.error("Falha ao exportar", e);
    } finally {
      setIsExporting(false);
    }
  }, [selectedType, filter]);

  const removeFilterKey = useCallback((key: keyof ReportFilter) => {
    setFilter(prev => ({ ...prev, [key]: key === "movementType" ? "all" : "" }));
  }, []);

  const fileName = `${selectedReport?.name.replace(/ /g, "_").toLowerCase() || "relatorio"}_${format(new Date(), "yyyyMMdd")}.pdf`;

  // Documento PDF montado com dados prontos
  const pdfDocument = selectedType && isPreviewOpen
    ? renderDocument(selectedType, reportData, filter, orientation)
    : null;

  return (
    <div className="h-[calc(100vh-1.5rem)] flex flex-col gap-5">

      {/* ── HEADER + KPIs ────────────────────────────────────────────────── */}
      <div className="shrink-0 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 px-1">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#111827" }}>
              Central de Relatórios
            </h1>
            <p className="text-base mt-1.5 font-medium" style={{ color: "#6B5A4E" }}>
              Escolha o relatório, ajuste os filtros e gere o PDF.
            </p>
          </div>
        </div>

        {kpis ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard icon={Activity} label="Produtos ativos" value={kpis.totalActiveProducts} tone="neutral" />
            <KpiCard icon={AlertTriangle} label="Estoque baixo" value={kpis.lowStockItems} tone={kpis.lowStockItems > 0 ? "danger" : "success"} />
            <KpiCard icon={Clock} label="Vencimentos (30 dias)" value={kpis.expiringBatches} tone={kpis.expiringBatches > 0 ? "warning" : "neutral"} />
            <KpiCard icon={TrendingUp} label="Atendimentos (30 dias)" value={kpis.totalProcedures30Days} tone="neutral" />
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse h-[88px] rounded-2xl border"
                style={{ backgroundColor: "#F7F4EE", borderColor: "#E8E0D2" }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── CORPO ────────────────────────────────────────────────────────── */}
      <div
        className="flex-1 flex overflow-hidden min-h-0 rounded-[28px] border"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "#E8E0D2",
          boxShadow: "0 16px 48px -20px rgba(74,51,40,0.14)",
        }}
      >
        <ReportSidebar
          selectedReportType={selectedType}
          onSelectReport={handleSelectReport}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: "#FAF8F5" }}>
          {selectedType ? (
            <div className="flex flex-col h-full min-h-0">
              {/* Título do relatório */}
              <div
                className="px-8 xl:px-10 pt-8 pb-6 border-b shrink-0"
                style={{ borderColor: "#E8E0D2", backgroundColor: "#FFFFFF" }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-start gap-5 min-w-0">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "#1A5347", color: "#F7F4EE" }}
                    >
                      <FileText size={26} />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <h2 className="text-2xl font-bold tracking-tight" style={{ color: "#111827" }}>
                        {selectedReport?.name}
                      </h2>
                      <p className="text-base mt-1.5 leading-relaxed" style={{ color: "#6B5A4E" }}>
                        {selectedReport?.description}
                      </p>
                    </div>
                  </div>
                  <FavoritesPanel
                    reportType={selectedType}
                    filter={filter}
                    onApply={setFilter}
                  />
                </div>
              </div>

              {/* Filtros — área scrollável com bastante respiro */}
              <div className="flex-1 overflow-y-auto px-8 xl:px-10 py-8 space-y-6">
                <ReportFilterPanel
                  reportType={selectedType}
                  filter={filter}
                  setFilter={setFilter}
                />
                <ActiveFilterPills
                  filter={filter}
                  reportType={selectedType}
                  onRemove={removeFilterKey}
                  onClearAll={handleClear}
                />
              </div>

              {/* Ações — botões grandes */}
              <div
                className="px-8 xl:px-10 py-6 border-t shrink-0"
                style={{ borderColor: "#E8E0D2", backgroundColor: "#FFFFFF" }}
              >
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="min-h-[52px] px-5 text-sm font-semibold rounded-2xl transition-all"
                    style={{ color: "#6B5A4E" }}
                    title="Ctrl + L"
                  >
                    <span className="inline-flex items-center gap-2 justify-center">
                      <RotateCcw size={18} /> Limpar filtros
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="min-h-[52px] px-5 text-sm font-semibold rounded-2xl border transition-all disabled:opacity-50"
                    style={{ color: "#4A3328", backgroundColor: "#FFFFFF", borderColor: "#D7CBB5" }}
                    title="Ctrl + R"
                  >
                    <span className="inline-flex items-center gap-2 justify-center">
                      <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
                      {isRefreshing ? "Atualizando..." : "Atualizar"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={isExporting}
                    className="min-h-[52px] px-6 text-sm font-bold rounded-2xl border transition-all disabled:opacity-50"
                    style={{ color: "#4A3328", backgroundColor: "#F7F4EE", borderColor: "#E5DEC9" }}
                    title="Ctrl + E"
                  >
                    <span className="inline-flex items-center gap-2 justify-center">
                      {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                      {isExporting ? "Exportando..." : "Exportar CSV"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isDataLoading}
                    className="min-h-[52px] min-w-[220px] px-8 text-base font-bold rounded-2xl transition-all disabled:opacity-60 active:scale-[0.99]"
                    style={{
                      color: "#FFFFFF",
                      backgroundColor: "#1A5347",
                      boxShadow: "0 10px 28px -8px rgba(26, 83, 71, 0.5)",
                    }}
                    title="Ctrl + Enter"
                  >
                    <span className="inline-flex items-center gap-2.5 justify-center">
                      {isDataLoading ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Carregando...
                        </>
                      ) : (
                        <>
                          <Printer size={20} />
                          Visualizar e Imprimir
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-16">
              <div
                className="w-24 h-24 rounded-[28px] flex items-center justify-center mb-8"
                style={{ backgroundColor: "#1A5347", color: "#F7F4EE" }}
              >
                <FileText size={40} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-bold mb-3" style={{ color: "#111827" }}>
                Selecione um relatório
              </h3>
              <p className="text-base max-w-md leading-relaxed" style={{ color: "#6B5A4E" }}>
                Use o menu à esquerda para escolher o documento. Depois configure os filtros e gere o PDF.
              </p>
              <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
                {[
                  { name: "Analítico do Paciente", hint: "Prontuário completo" },
                  { name: "Posição de Estoque", hint: "Saldos e validade" },
                  { name: "Histórico de Aplicações", hint: "Atendimentos" },
                ].map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => {
                      const r = reportGroups.flatMap((g) => g.reports).find((r) => r.name === item.name);
                      if (r) handleSelectReport(r.id);
                    }}
                    className="px-5 py-5 text-left rounded-3xl border transition-all hover:shadow-lg hover:-translate-y-0.5"
                    style={{ backgroundColor: "#FFFFFF", borderColor: "#E5DEC9" }}
                  >
                    <span className="block text-xs font-semibold mb-1.5" style={{ color: "#8C7A6B" }}>
                      {item.hint}
                    </span>
                    <span className="block text-sm font-bold leading-snug" style={{ color: "#1A5347" }}>
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FIX: Toast de erro de export — visível para o usuário */}
      {exportError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                        bg-red-600 text-white px-5 py-3 rounded-xl shadow-xl
                        flex items-center gap-3 text-sm font-medium max-w-lg w-full
                        animate-in slide-in-from-bottom duration-300">
          <AlertTriangle size={16} className="shrink-0" />
          <span className="flex-1">{exportError}</span>
          <button
            type="button"
            onClick={() => setExportError(null)}
            className="shrink-0 hover:bg-red-500 rounded-lg p-1 transition-colors"
            aria-label="Fechar"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── PDF VIEWER MODAL ─────────────────────────────────────────────── */}
      {isPreviewOpen && pdfDocument && (
        <PdfViewerEngine
          onClose={() => setIsPreviewOpen(false)}
          document={pdfDocument}
          fileName={fileName}
          reportTitle={selectedReport?.name || "Relatório"}
          orientation={orientation}
          onOrientationChange={o => {
            setOrientation(o);
            // Recriar o documento com nova orientação ao fechar/reabrir não é necessário
            // pois o documento é gerado fresh quando isPreviewOpen é true e orientation muda
          }}
          onExport={handleExport}
          isExporting={isExporting}
        />
      )}
    </div>
  );
}
