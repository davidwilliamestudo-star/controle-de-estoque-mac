import { useState, useMemo } from "react";
import { X, Layout, FileText, Calendar, Filter, Settings2, Download } from "lucide-react";
import type { PatientRecord, ProcedureSummary } from "../schemas/patient.schema";
import { PatientRecordReport, PatientReportConfig } from "./PatientRecordReport";
import { parseISO, isAfter, isBefore, startOfDay, endOfDay, format } from "date-fns";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";

interface PatientRecordReportPanelProps {
  record: PatientRecord;
  procedures: ProcedureSummary[];
  onClose: () => void;
}

export function PatientRecordReportPanel({ record, procedures, onClose }: PatientRecordReportPanelProps) {
  // Config state
  const [config, setConfig] = useState<PatientReportConfig>({
    showPatientInfo: true,
    showAlerts: true,
    showEvolutions: true,
    showIntercurrences: true,
    showItems: true,
    showBatches: false,
    orientation: "portrait"
  });

  // Filters state
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "finalized" | "in_progress">("all");

  // Filter procedures based on filters
  const filteredProcedures = useMemo(() => {
    return procedures.filter(proc => {
      // Status filter
      if (statusFilter !== "all" && proc.status !== statusFilter) return false;
      
      // Date filter
      if (startDate || endDate) {
        const procDate = parseISO(proc.performed_at);
        if (startDate && isBefore(procDate, startOfDay(parseISO(startDate)))) return false;
        if (endDate && isAfter(procDate, endOfDay(parseISO(endDate)))) return false;
      }
      
      return true;
    });
  }, [procedures, startDate, endDate, statusFilter]);

  const toggleConfig = (key: keyof PatientReportConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const documentElement = <PatientRecordReport record={record} procedures={filteredProcedures} config={config} />;
  const fileName = `Prontuario_${record.full_name.replace(/ /g, "_")}_${format(new Date(), "yyyyMMdd")}.pdf`;

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 flex overflow-hidden">
      
      {/* SIDEBAR DE CONFIGURAÇÕES */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-xl h-full overflow-y-auto">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="font-bold flex items-center gap-2 text-gray-800">
            <Settings2 size={18} />
            Exportar Relatório
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 space-y-8">
          
          {/* Seção de Filtros */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-1.5">
              <Filter size={12} /> Filtros de Procedimento
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Data Inicial</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="date" 
                    className="form-control text-sm py-2 pl-9 rounded-lg border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white transition-colors w-full" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)} 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Data Final</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="date" 
                    className="form-control text-sm py-2 pl-9 rounded-lg border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white transition-colors w-full" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)} 
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Seção de Colunas / Visibilidade */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-1.5">
              <Layout size={12} /> O que incluir
            </h3>
            
            <div className="space-y-3">
              <ToggleRow label="Dados Cadastrais" checked={config.showPatientInfo} onChange={() => toggleConfig('showPatientInfo')} />
              <ToggleRow label="Alertas Médicos" checked={config.showAlerts} onChange={() => toggleConfig('showAlerts')} />
              <ToggleRow label="Evoluções Clínicas" checked={config.showEvolutions} onChange={() => toggleConfig('showEvolutions')} />
              <ToggleRow label="Intercorrências" checked={config.showIntercurrences} onChange={() => toggleConfig('showIntercurrences')} />
              <ToggleRow label="Itens Utilizados (Estoque)" checked={config.showItems} onChange={() => toggleConfig('showItems')} />
              
              {config.showItems && (
                <div className="pl-6 mt-2 border-l-2 border-gray-100 ml-1">
                  <ToggleRow label="Lotes e Validades" checked={config.showBatches} onChange={() => toggleConfig('showBatches')} />
                </div>
              )}
            </div>
          </section>

          {/* Rotação / Formato */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-1.5">
              <FileText size={12} /> Formato da Página
            </h3>
            
            <div className="flex bg-gray-100/80 p-1 rounded-lg border border-gray-200/50">
              <button 
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${config.orientation === "portrait" ? "bg-white shadow-sm text-gray-900 border border-gray-200/50" : "text-gray-500 hover:text-gray-700"}`}
                onClick={() => setConfig(prev => ({ ...prev, orientation: "portrait" }))}
              >
                Retrato
              </button>
              <button 
                className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${config.orientation === "landscape" ? "bg-white shadow-sm text-gray-900 border border-gray-200/50" : "text-gray-500 hover:text-gray-700"}`}
                onClick={() => setConfig(prev => ({ ...prev, orientation: "landscape" }))}
              >
                Paisagem
              </button>
            </div>
          </section>

        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 mb-3 text-center">Exibindo {filteredProcedures.length} de {procedures.length} proc.</p>
          <PDFDownloadLink
            document={documentElement}
            fileName={fileName}
            className="w-full btn btn-primary flex justify-center items-center py-2"
          >
            {({ loading }) => (
              <>
                <Download size={18} className="mr-2" />
                {loading ? "Gerando..." : "Baixar PDF"}
              </>
            )}
          </PDFDownloadLink>
        </div>
      </div>

      {/* ÁREA DE PREVIEW (PDF) */}
      <div className="flex-1 bg-gray-500 relative">
         <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
           {documentElement}
         </PDFViewer>
      </div>
      
      <style>{`
        body { overflow: hidden; }
      `}</style>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900 transition-colors">{label}</span>
      <div 
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${checked ? 'bg-primary-600' : 'bg-gray-200'}`}
        onClick={(e) => {
          e.preventDefault();
          onChange();
        }}
      >
        <span 
          aria-hidden="true" 
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`} 
        />
      </div>
    </label>
  );
}
