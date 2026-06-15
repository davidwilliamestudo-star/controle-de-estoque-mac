import { useState } from "react";
import { Clock, Pill } from "lucide-react";
import { usePatientProcedures } from "../hooks/useBodyAreas";
import { ProcedureBodyMapPreview } from "./ProcedureBodyMapPreview";
import { ProcedureDetailsModal } from "./ProcedureDetailsModal";

interface PatientProcedureHistoryProps {
  patientId: string | null;
}

export function PatientProcedureHistory({ patientId }: PatientProcedureHistoryProps) {
  const { data: procedures = [], isLoading } = usePatientProcedures(patientId);
  const [selectedProc, setSelectedProc] = useState<any | null>(null);

  if (!patientId) return null;

  return (
    <div className="card shadow-sm border mt-4" style={{ borderColor: "var(--color-gray-200)" }}>
      <h2 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-900">
        <Clock size={14} className="text-gray-500" /> Últimas Aplicações
      </h2>

      {isLoading ? (
        <p className="text-xs text-gray-500">Carregando histórico...</p>
      ) : procedures.length === 0 ? (
        <p className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded">Nenhum histórico encontrado para este paciente.</p>
      ) : (
        <div className="space-y-3">
          {procedures.slice(0, 3).map((proc: any) => (
            <div 
              key={proc.id} 
              className="text-sm pb-3 border-b border-gray-100 last:border-0 last:pb-0 flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
              onClick={() => setSelectedProc(proc)}
            >
              {proc.bodyAreaSvgId && (
                <div className="mt-1 flex-shrink-0">
                  <ProcedureBodyMapPreview 
                    svgRegionId={proc.bodyAreaSvgId} 
                    routeCode={proc.routeName} 
                    size="sm" 
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-800">
                    {proc.performedAt ? new Date(proc.performedAt).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' }) : "Data não definida"}
                  </p>
                  {proc.isCorrected === 1 && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                      Corrigido
                    </span>
                  )}
                </div>
                {proc.protocolName && (
                  <p className="text-xs text-gray-600 truncate mt-0.5">{proc.protocolName}</p>
                )}
                {proc.bodyAreaName && (
                  <p className="text-xs text-green-700 mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                    {proc.bodyAreaName}
                  </p>
                )}
                {/* List medications in the summary */}
                {proc.items && proc.items.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {proc.items.slice(0, 2).map((item: any) => (
                      <p key={item.id} className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Pill size={10} />
                        {item.itemName} - {item.quantityUsed} {item.unit}
                        {item.batchNumberSnapshot ? ` (Lote: ${item.batchNumberSnapshot})` : ""}
                      </p>
                    ))}
                    {proc.items.length > 2 && (
                      <p className="text-[10px] text-gray-400 italic">+{proc.items.length - 2} outro(s) item(ns)</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {procedures.length > 3 && (
            <button className="text-xs text-gray-500 hover:text-gray-800 underline w-full text-center mt-2">
              Ver histórico completo
            </button>
          )}
        </div>
      )}

      {selectedProc && (
        <ProcedureDetailsModal 
          procedure={selectedProc}
          onClose={() => setSelectedProc(null)}
        />
      )}
    </div>
  );
}
