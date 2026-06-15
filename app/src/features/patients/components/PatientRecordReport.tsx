import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ReportDocumentLayout } from "@/features/reports/components/ReportDocumentLayout";
import { Clock, MapPin, Activity, AlertTriangle, List, Pill, Package } from "lucide-react";
import type { PatientRecord, ProcedureSummary } from "../schemas/patient.schema";

export interface PatientReportConfig {
  showPatientInfo: boolean;
  showAlerts: boolean;
  showEvolutions: boolean;
  showIntercurrences: boolean;
  showItems: boolean;
  showBatches: boolean;
  orientation: "portrait" | "landscape";
}

interface PatientRecordReportProps {
  record: PatientRecord;
  procedures: ProcedureSummary[];
  config: PatientReportConfig;
}

export function PatientRecordReport({ record, procedures, config }: PatientRecordReportProps) {
  const calcAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <ReportDocumentLayout
      title="Prontuário de Paciente"
      subtitle={`Paciente: ${record.full_name}`}
    >
      <div className="space-y-6 text-sm">
        {/* Patient Info */}
        {config.showPatientInfo && (
          <section className="bg-gray-50 p-4 rounded-lg border border-gray-200 print-avoid-break">
            <h2 className="font-bold text-gray-800 mb-3 uppercase tracking-wider text-xs flex items-center gap-2">
              Dados do Paciente
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 mb-0.5">Nome Completo</p>
                <p className="font-medium text-gray-900">{record.full_name}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Nascimento / Idade</p>
                <p className="font-medium text-gray-900">
                  {record.birth_date ? `${format(new Date(record.birth_date), 'dd/MM/yyyy')} (${calcAge(record.birth_date)} anos)` : "Não informado"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Telefone</p>
                <p className="font-medium text-gray-900">{record.phone || "Não informado"}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">E-mail</p>
                <p className="font-medium text-gray-900">{record.email || "Não informado"}</p>
              </div>
              {record.notes && (
                <div className="col-span-2 mt-2">
                  <p className="text-gray-500 mb-0.5">Observações Clínicas</p>
                  <p className="font-medium text-gray-900">{record.notes}</p>
                </div>
              )}
              {config.showAlerts && record.alert_notes && (
                <div className="col-span-2 mt-2">
                  <p className="text-red-600 mb-0.5 font-bold flex items-center gap-1">
                    <AlertTriangle size={14} /> Alertas Médicos
                  </p>
                  <p className="font-medium text-red-700 bg-red-50 p-2 rounded">{record.alert_notes}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Procedures History */}
        <section>
          <h2 className="font-bold text-gray-800 mb-4 uppercase tracking-wider text-xs border-b pb-2 flex items-center gap-2">
            <List size={14} /> Histórico de Procedimentos ({procedures.length})
          </h2>
          
          {procedures.length === 0 ? (
            <p className="text-gray-500 text-center py-4 italic">Nenhum procedimento registrado.</p>
          ) : (
            <div className="space-y-4">
              {procedures.map((proc, index) => (
                <div key={proc.id} className="border border-gray-200 rounded-lg p-4 print-avoid-break">
                  <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-2">
                    <h3 className="font-bold text-gray-900 text-base">
                      {procedures.length - index}. {proc.protocol_name || "Procedimento Avulso"}
                    </h3>
                    <div className="text-right">
                      <span className="text-gray-500 flex items-center gap-1 justify-end font-medium">
                        <Clock size={12} /> {format(new Date(proc.performed_at), "dd/MM/yyyy 'às' HH:mm")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-gray-600 mb-3">
                    {proc.body_area_name && (
                      <span className="flex items-center gap-1"><MapPin size={12} className="text-gray-400" /> {proc.body_area_name} {(proc as any).body_area_side && `(${(proc as any).body_area_side})`}</span>
                    )}
                    {(proc as any).route_name && (
                      <span className="flex items-center gap-1"><Activity size={12} className="text-gray-400" /> Via {(proc as any).route_name}</span>
                    )}
                  </div>
                  
                  {config.showItems && (proc as any).items_used && (proc as any).items_used.length > 0 && (
                    <div className="mt-3">
                      <p className="font-semibold text-xs text-gray-700 mb-1">Itens Utilizados:</p>
                      <ul className="list-disc pl-4 text-xs text-gray-600">
                        {(proc as any).items_used.map((item: any) => (
                          <li key={item.id}>
                            {item.item_name} - {item.quantity_used} {item.unit}
                            {config.showBatches && item.batch_number && ` (Lote: ${item.batch_number})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {config.showIntercurrences && (
                    proc.had_intercurrence ? (
                      <div className="mb-3 bg-red-50 text-red-800 p-2 rounded text-xs border border-red-100">
                        <strong>Intercorrência relatada:</strong> {proc.intercurrence_description}
                      </div>
                    ) : (
                      <p className="text-xs text-green-700 mb-3 font-medium">Sem intercorrências.</p>
                    )
                  )}

                  {config.showEvolutions && proc.evolution_text && (
                    <div className="bg-gray-50 p-3 rounded border border-gray-100 mt-2">
                      <p className="text-xs font-semibold text-gray-500 mb-1">Evolução Clínica</p>
                      <p className="text-gray-800 whitespace-pre-wrap">{proc.evolution_text}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </ReportDocumentLayout>
  );
}
