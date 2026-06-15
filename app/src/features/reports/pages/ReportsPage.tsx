import { useState } from "react";
import { Activity, AlertTriangle, FileText, Package, ShoppingCart } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { format, subDays } from "date-fns";
import { ReportFilters } from "../components/ReportFilters";
import { ReportViewer } from "../components/ReportViewer";
import { ConsumptionReport } from "../components/reports/ConsumptionReport";
import { DetailedOperationalReport } from "../components/reports/DetailedOperationalReport";
import { PatientGeneralReport } from "../components/reports/PatientGeneralReport";
import { PatientHistoryReport } from "../components/reports/PatientHistoryReport";
import { StockMovementsReport } from "../components/reports/StockMovementsReport";
import { StockPositionReport } from "../components/reports/StockPositionReport";
import { TraceabilityReport } from "../components/reports/TraceabilityReport";
import { useDashboardKPIs } from "../hooks/useReports";
import type { ReportFilter, ReportType } from "../schemas/report.schema";

type ConcreteReportType = Exclude<ReportType, null>;

const detailedReportTypes: ConcreteReportType[] = [
  "patient_evolutions",
  "patient_medications",
  "patient_materials",
  "patient_batches",
  "patient_body_areas",
  "stock_low",
  "stock_expirations",
  "stock_expired",
  "stock_entries",
  "stock_exits",
  "batch_by_item",
  "protocols_list",
  "protocol_procedures",
  "audit_log",
  "labels_generated",
];

const reportGroups: Array<{
  title: string;
  reports: Array<{ id: ConcreteReportType; name: string; description: string }>;
}> = [
  {
    title: "Pacientes e Prontuarios",
    reports: [
      { id: "patient_general", name: "1. Geral do Paciente", description: "Cadastro, aplicacoes, evolucoes, itens e lotes." },
      { id: "patient_history", name: "2. Historico de Aplicacoes", description: "Aplicacoes finalizadas por periodo." },
      { id: "patient_evolutions", name: "3. Evolucoes por Paciente", description: "Evolucoes e intercorrencias registradas." },
      { id: "patient_medications", name: "4. Medicamentos Usados", description: "Medicamentos aplicados por paciente e lote." },
      { id: "patient_materials", name: "5. Materiais Usados", description: "Materiais consumidos nas aplicacoes." },
      { id: "patient_batches", name: "6. Lotes Usados", description: "Lotes vinculados a pacientes." },
      { id: "patient_body_areas", name: "7. Areas Corporais", description: "Resumo por area tratada." },
    ],
  },
  {
    title: "Estoque e Consumo",
    reports: [
      { id: "stock_position", name: "8. Estoque Atual", description: "Saldo atual, minimo e proximo vencimento." },
      { id: "stock_low", name: "9. Estoque Baixo", description: "Itens abaixo do minimo cadastrado." },
      { id: "stock_expirations", name: "10. Vencimentos Proximos", description: "Lotes que vencem nos proximos 30 dias." },
      { id: "stock_expired", name: "11. Itens Vencidos", description: "Lotes vencidos com saldo." },
      { id: "stock_consumption", name: "12. Consumo por Periodo", description: "Consumo agregado por item." },
      { id: "stock_movements", name: "13. Movimentacoes", description: "Entradas, saidas, ajustes e usos." },
      { id: "stock_entries", name: "14. Entradas", description: "Entradas registradas no estoque." },
      { id: "stock_exits", name: "15. Saidas", description: "Saidas manuais, perdas e baixas." },
    ],
  },
  {
    title: "Rastreabilidade e Operacao",
    reports: [
      { id: "batch_by_item", name: "16. Lotes por Item", description: "Inventario de lotes por produto." },
      { id: "patients_by_batch", name: "17. Pacientes por Lote", description: "Rastreabilidade por numero de lote." },
      { id: "protocols_list", name: "18. Protocolos Cadastrados", description: "Protocolos, vias, itens e uso." },
      { id: "protocol_procedures", name: "19. Aplicacoes por Protocolo", description: "Volume e intercorrencias por protocolo." },
      { id: "audit_log", name: "20. Auditoria", description: "Logs operacionais do sistema." },
      { id: "labels_generated", name: "21. Etiquetas Geradas", description: "Historico de impressao de etiquetas." },
    ],
  },
];

function defaultFilter(): ReportFilter {
  return {
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    batchNumber: "",
    categoryId: "",
    itemType: "",
    movementType: "all",
  };
}

export default function ReportsPage() {
  const [selectedReportType, setSelectedReportType] = useState<ReportType>(null);
  const [previewReportType, setPreviewReportType] = useState<ReportType>(null);
  const [filter, setFilter] = useState<ReportFilter>(defaultFilter);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape");
  const { data: kpis } = useDashboardKPIs();

  const selectedReport = reportGroups.flatMap(group => group.reports).find(report => report.id === selectedReportType);

  const generateReport = () => {
    if (selectedReportType) {
      setPreviewReportType(selectedReportType);
    }
  };

  const clearFilters = () => setFilter(defaultFilter());
  const closeReport = () => setPreviewReportType(null);

  return (
    <>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">Central de Relatórios Clínicos e Operacionais</h1>
          <p className="page-subtitle">Gere documentos de pacientes, aplicações, estoque, rastreabilidade, protocolos, auditoria e etiquetas.</p>
        </div>
        <div>
          <Link to="/reports/purchase-plan" className="btn btn-primary">
            <ShoppingCart size={16} className="mr-2" />
            Lista de Compras Inteligente
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-4 flex items-center gap-4 bg-white border-l-4 border-l-blue-500">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Package size={20} /></div>
          <div>
            <div className="text-2xl font-bold">{kpis?.totalActiveProducts || 0}</div>
            <div className="text-xs text-gray-500 font-medium">PRODUTOS ATIVOS</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4 bg-white border-l-4 border-l-yellow-500">
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg"><AlertTriangle size={20} /></div>
          <div>
            <div className="text-2xl font-bold">{kpis?.lowStockItems || 0}</div>
            <div className="text-xs text-gray-500 font-medium">ABAIXO DO MÍNIMO</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4 bg-white border-l-4 border-l-red-500">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg"><AlertTriangle size={20} /></div>
          <div>
            <div className="text-2xl font-bold">{kpis?.expiringBatches || 0}</div>
            <div className="text-xs text-gray-500 font-medium">LOTES VENCENDO</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4 bg-white border-l-4 border-l-green-500">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg"><Activity size={20} /></div>
          <div>
            <div className="text-2xl font-bold">{kpis?.totalProcedures30Days || 0}</div>
            <div className="text-xs text-gray-500 font-medium">APLICAÇÕES 30D</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-1 flex flex-col gap-4">
          {reportGroups.map((group) => (
            <div key={group.title} className="card p-4">
              <h3 className="font-bold text-sm text-gray-500 uppercase mb-3">{group.title}</h3>
              <div className="flex flex-col gap-1">
                {group.reports.map(report => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReportType(report.id)}
                    className={`text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedReportType === report.id
                        ? "bg-green-50 text-green-800 font-bold border border-green-200"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span className="block">{report.name}</span>
                    <span className="block text-xs font-normal opacity-70 mt-0.5">{report.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-3">
          {selectedReportType ? (
            <>
              <div className="card p-5 mb-4 border-l-4 border-l-green-700">
                <div className="flex items-start gap-3">
                  <FileText size={22} className="text-green-700 mt-1" />
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedReport?.name}</h2>
                    <p className="text-sm text-gray-500">{selectedReport?.description}</p>
                  </div>
                </div>
              </div>
              <ReportFilters
                reportType={selectedReportType}
                filter={filter}
                setFilter={setFilter}
                onGenerate={generateReport}
                onClear={clearFilters}
              />
            </>
          ) : (
            <div className="card p-10 text-center text-gray-400 border-dashed bg-gray-50">
              <Package size={48} className="mx-auto mb-4 opacity-20" />
              <h3 className="text-xl font-bold text-gray-600">Selecione um Relatório</h3>
              <p className="mt-2">Escolha um tipo de relatório no menu lateral para configurar filtros e gerar o documento.</p>
            </div>
          )}
        </div>
      </div>

      {previewReportType && (
        <ReportViewer onClose={closeReport} orientation={orientation} onOrientationChange={setOrientation}>
          {previewReportType === "stock_position" && <StockPositionReport filter={filter} />}
          {previewReportType === "stock_movements" && <StockMovementsReport filter={filter} />}
          {previewReportType === "stock_consumption" && <ConsumptionReport filter={filter} />}
          {previewReportType === "patients_by_batch" && <TraceabilityReport batchNumber={filter.batchNumber || ""} />}
          {previewReportType === "patient_history" && <PatientHistoryReport filter={filter} />}
          {previewReportType === "patient_general" && <PatientGeneralReport filter={filter} />}
          {detailedReportTypes.includes(previewReportType) && (
            <DetailedOperationalReport reportType={previewReportType} filter={filter} />
          )}
        </ReportViewer>
      )}
    </>
  );
}
