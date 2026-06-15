import { X, Pill, CheckCircle, FileText, MapPin } from "lucide-react";
import { ProcedureBodyMapPreview } from "./ProcedureBodyMapPreview";
import type { PatientProcedureSummary } from "../repositories/procedures.repository";
import type { ProcedureItemUsed } from "../types";

interface ProcedureDetailsModalProps {
  procedure: PatientProcedureSummary;
  onClose: () => void;
}

export function ProcedureDetailsModal({ procedure, onClose }: ProcedureDetailsModalProps) {
  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="icon-box icon-box-primary">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="modal-title">Detalhes da Aplicação</h2>
                {procedure.isCorrected === 1 && (
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 font-medium">
                    Corrigido
                  </span>
                )}
              </div>
              <p className="modal-subtitle">
                {procedure.performedAt 
                  ? new Date(procedure.performedAt).toLocaleDateString("pt-BR", { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                  : "Data não definida"}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body space-y-6">
          {/* Section: Resumo */}
          <div className="grid-2">
            <div className="bg-gray-50 p-3 rounded border border-gray-100">
              <span className="text-xs text-gray-500 font-medium block mb-1">Protocolo</span>
              <p className="text-sm font-semibold text-gray-900">{procedure.protocolName || "Não informado"}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded border border-gray-100">
              <span className="text-xs text-gray-500 font-medium block mb-1">Via de Aplicação</span>
              <p className="text-sm font-semibold text-gray-900">{procedure.routeName || "Não informada"}</p>
            </div>
          </div>

          {/* Section: Área Corporal e Itens */}
          <div className="flex gap-6 items-start">
            {procedure.bodyAreaSvgId ? (
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500 font-medium mb-2 flex items-center gap-1">
                  <MapPin size={14} /> Local
                </span>
                <ProcedureBodyMapPreview 
                  svgRegionId={procedure.bodyAreaSvgId} 
                  routeCode={procedure.routeName} 
                  size="lg" 
                />
                <p className="text-sm font-medium text-green-700 mt-2">
                  {procedure.bodyAreaName}
                </p>
              </div>
            ) : (
              <div className="w-64 flex-shrink-0 bg-gray-50 border border-gray-200 rounded flex items-center justify-center text-xs text-gray-400 h-64">
                Sem mapa corporal
              </div>
            )}

            <div className="flex-1">
              <span className="text-xs text-gray-500 font-medium mb-2 flex items-center gap-1">
                <Pill size={14} /> Medicamentos / Itens Utilizados
              </span>
              
              {(!procedure.items || procedure.items.length === 0) ? (
                <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded border border-gray-100">
                  Nenhum item registrado nesta aplicação.
                </div>
              ) : (
                <ul className="space-y-2 mt-2">
                  {procedure.items.map((item: ProcedureItemUsed) => (
                    <li key={item.id} className="p-3 bg-white border border-gray-200 rounded shadow-sm">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-semibold text-gray-800">{item.itemName}</p>
                        <span className="text-xs font-bold bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200">
                          {item.quantityUsed} {item.unit}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                        {item.batchNumberSnapshot && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">Lote:</span> {item.batchNumberSnapshot}
                          </span>
                        )}
                        {item.expirationDateSnapshot && (
                          <span className="flex items-center gap-1">
                            <span className="font-medium text-gray-700">Validade:</span> {new Date(item.expirationDateSnapshot).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Section: Evolução Clínica */}
          {procedure.evolutionText && (
            <div className="mt-4">
              <span className="text-xs text-gray-500 font-medium mb-1 block">Evolução Clínica</span>
              <div className="p-3 bg-blue-50 text-blue-900 border border-blue-100 rounded text-sm whitespace-pre-wrap">
                {procedure.evolutionText}
              </div>
            </div>
          )}

          {procedure.isCorrected === 1 && procedure.correctionReason && (
            <div className="mt-4">
              <span className="text-xs text-amber-600 font-medium mb-1 block">Motivo da Correção</span>
              <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded text-sm whitespace-pre-wrap">
                {procedure.correctionReason}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
