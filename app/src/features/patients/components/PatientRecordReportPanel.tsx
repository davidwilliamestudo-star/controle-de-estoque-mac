import { useState, useMemo } from "react";
import { Printer, X, Layout, FileText, Calendar, Filter, Settings2, RotateCcw } from "lucide-react";
import type { PatientRecord, ProcedureSummary } from "../schemas/patient.schema";
import { PatientRecordReport, PatientReportConfig } from "./PatientRecordReport";
import { parseISO, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";

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

  const handlePrint = () => {
    window.print();
  };

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

  return (
    <div className="fixed inset-0 bg-gray-100 z-50 flex print:static print:bg-transparent print:block overflow-hidden print:overflow-visible print:h-auto">
      
      {/* SIDEBAR DE CONFIGURAÇÕES (Oculto na impressão) */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col no-print shadow-xl h-full overflow-y-auto">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="font-bold flex items-center gap-2 text-gray-800">
            <Settings2 size={18} />
            Exportar Relatório
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 flex-1 space-y-6">
          
          {/* Seção de Filtros */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1">
              <Filter size={14} /> Filtros de Procedimento
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Data Inicial</label>
                <input 
                  type="date" 
                  className="form-control text-sm py-1.5" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Data Final</label>
                <input 
                  type="date" 
                  className="form-control text-sm py-1.5" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                />
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Seção de Colunas / Visibilidade */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1">
              <Layout size={14} /> O que incluir
            </h3>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                <input type="checkbox" checked={config.showPatientInfo} onChange={() => toggleConfig('showPatientInfo')} className="rounded text-primary-600 focus:ring-primary-500" />
                Dados Cadastrais
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                <input type="checkbox" checked={config.showAlerts} onChange={() => toggleConfig('showAlerts')} className="rounded text-primary-600 focus:ring-primary-500" />
                Alertas Médicos
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                <input type="checkbox" checked={config.showEvolutions} onChange={() => toggleConfig('showEvolutions')} className="rounded text-primary-600 focus:ring-primary-500" />
                Evoluções Clínicas
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                <input type="checkbox" checked={config.showIntercurrences} onChange={() => toggleConfig('showIntercurrences')} className="rounded text-primary-600 focus:ring-primary-500" />
                Intercorrências
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                <input type="checkbox" checked={config.showItems} onChange={() => toggleConfig('showItems')} className="rounded text-primary-600 focus:ring-primary-500" />
                Itens Utilizados (Estoque)
              </label>
              
              {config.showItems && (
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-500 ml-5">
                  <input type="checkbox" checked={config.showBatches} onChange={() => toggleConfig('showBatches')} className="rounded text-primary-600 focus:ring-primary-500" />
                  Lotes e Validades
                </label>
              )}
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Rotação / Formato */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1">
              <FileText size={14} /> Formato da Página
            </h3>
            
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${config.orientation === "portrait" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                onClick={() => setConfig(prev => ({ ...prev, orientation: "portrait" }))}
              >
                Retrato (Vertical)
              </button>
              <button 
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${config.orientation === "landscape" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                onClick={() => setConfig(prev => ({ ...prev, orientation: "landscape" }))}
              >
                Paisagem (Horiz.)
              </button>
            </div>
          </section>

        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 mb-3 text-center">Exibindo {filteredProcedures.length} de {procedures.length} proc.</p>
          <button 
            onClick={handlePrint}
            className="w-full btn btn-primary flex justify-center items-center py-2"
          >
            <Printer size={18} className="mr-2" />
            Imprimir PDF
          </button>
        </div>
      </div>

      {/* ÁREA DE PREVIEW (Visível e única na impressão) */}
      <div className="flex-1 overflow-y-auto bg-gray-200 flex justify-center p-8 print:p-0 print:bg-transparent print:block print:overflow-visible relative">
        {/* Folha A4 simulada */}
        <div className="bg-white shadow-2xl transition-all duration-300 print:shadow-none print:w-full print:max-w-none print:m-0" 
             style={{ 
               width: config.orientation === "landscape" ? "297mm" : "210mm",
               minHeight: config.orientation === "landscape" ? "210mm" : "297mm",
               margin: "0 auto"
             }}>
          <PatientRecordReport 
            record={record} 
            procedures={filteredProcedures} 
            config={config} 
          />
        </div>
      </div>
      
      {/* Oculta scrollbars do body enquanto modal está aberto */}
      <style>{`
        body { overflow: hidden; }
        @media print {
          body { overflow: visible; }
          
          @page {
            size: A4 ${config.orientation};
            margin: 10mm 15mm;
          }
          
          /* Garantir que o body e o html permitam ao layout usar o espaço físico da folha */
          html, body {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .report-print-root {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
