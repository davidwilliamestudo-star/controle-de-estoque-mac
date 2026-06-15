import { format } from "date-fns";
import { Activity, AlertTriangle, FileText, Package, User } from "lucide-react";
import { usePatientGeneralReport } from "../../hooks/useReports";
import type { ReportFilter } from "../../schemas/report.schema";
import { ReportDocumentLayout } from "../ReportDocumentLayout";

interface Props {
  filter: ReportFilter;
}

function formatDate(value?: string | null) {
  if (!value) return "Nao informado";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, "dd/MM/yyyy");
}

export function PatientGeneralReport({ filter }: Props) {
  const { data, isLoading } = usePatientGeneralReport(filter.patientId);

  if (!filter.patientId) {
    return (
      <ReportDocumentLayout title="Relatorio Geral do Paciente" subtitle="Nenhum paciente selecionado">
        <div className="text-center py-20 text-gray-500">
          Selecione um paciente nos filtros para gerar este relatorio.
        </div>
      </ReportDocumentLayout>
    );
  }

  if (isLoading) {
    return (
      <ReportDocumentLayout title="Carregando relatorio" subtitle="Buscando dados no banco local...">
        <div className="text-center py-20 text-gray-500">Carregando informacoes do paciente...</div>
      </ReportDocumentLayout>
    );
  }

  if (!data || !data.patient) {
    return (
      <ReportDocumentLayout title="Relatorio Geral do Paciente" subtitle="Paciente nao encontrado">
        <div className="text-center py-20 text-red-500">
          Nao foi possivel encontrar os dados deste paciente.
        </div>
      </ReportDocumentLayout>
    );
  }

  const { patient, procedures, used_items, used_batches } = data;
  const finalized = procedures.filter((procedure) => procedure.status === "finalized");
  const intercurrences = procedures.filter((procedure) => Number(procedure.had_intercurrence) === 1);

  return (
    <ReportDocumentLayout
      title="Relatorio Analitico do Paciente"
      subtitle={`Paciente: ${patient.full_name}`}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="rounded-lg p-4 bg-green-50 text-green-800 border border-green-100">
          <p className="text-xs uppercase font-semibold opacity-70">Aplicacoes finalizadas</p>
          <p className="text-2xl font-bold mt-1">{finalized.length}</p>
        </div>
        <div className="rounded-lg p-4 bg-blue-50 text-blue-800 border border-blue-100">
          <p className="text-xs uppercase font-semibold opacity-70">Itens usados</p>
          <p className="text-2xl font-bold mt-1">{used_items.length}</p>
        </div>
        <div className="rounded-lg p-4 bg-purple-50 text-purple-800 border border-purple-100">
          <p className="text-xs uppercase font-semibold opacity-70">Lotes usados</p>
          <p className="text-2xl font-bold mt-1">{used_batches.length}</p>
        </div>
        <div className="rounded-lg p-4 bg-red-50 text-red-800 border border-red-100">
          <p className="text-xs uppercase font-semibold opacity-70">Intercorrencias</p>
          <p className="text-2xl font-bold mt-1">{intercurrences.length}</p>
        </div>
      </div>

      <section className="mb-8">
        <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
          <User size={20} className="text-green-700" /> Informacoes cadastrais
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg border border-gray-100">
          <div><span className="font-semibold text-gray-500">Nome:</span> {patient.full_name}</div>
          <div><span className="font-semibold text-gray-500">Telefone:</span> {patient.phone || "Nao informado"}</div>
          <div><span className="font-semibold text-gray-500">E-mail:</span> {patient.email || "Nao informado"}</div>
          <div><span className="font-semibold text-gray-500">Nascimento:</span> {formatDate(patient.birth_date)}</div>
          <div><span className="font-semibold text-gray-500">Paciente desde:</span> {formatDate(patient.created_at)}</div>
          <div><span className="font-semibold text-gray-500">Alertas:</span> {patient.alert_notes || "Sem alertas"}</div>
          {patient.notes && (
            <div className="col-span-2"><span className="font-semibold text-gray-500">Observacoes:</span> {patient.notes}</div>
          )}
        </div>
      </section>

      <section className="mb-8 break-inside-avoid">
        <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
          <Activity size={20} className="text-blue-700" /> Historico de aplicacoes
        </h3>

        {procedures.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Nenhuma aplicacao registrada para este paciente.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-left">
                <th className="p-2 border border-gray-200">Data</th>
                <th className="p-2 border border-gray-200">Protocolo</th>
                <th className="p-2 border border-gray-200">Area</th>
                <th className="p-2 border border-gray-200 text-center">Itens</th>
                <th className="p-2 border border-gray-200 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {procedures.map((procedure, index) => (
                <tr key={procedure.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="p-2 border border-gray-200">{formatDate(procedure.performed_at)}</td>
                  <td className="p-2 border border-gray-200 font-medium">{procedure.protocol_name || "Aplicacao avulsa"}</td>
                  <td className="p-2 border border-gray-200">{procedure.body_area_name || "-"}</td>
                  <td className="p-2 border border-gray-200 text-center">{procedure.total_items_used}</td>
                  <td className="p-2 border border-gray-200 text-center">{procedure.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {procedures.some((procedure) => procedure.evolution_text || procedure.intercurrence_description) && (
        <section className="mb-8 break-inside-avoid">
          <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
            <FileText size={20} className="text-indigo-700" /> Evolucoes e intercorrencias
          </h3>
          <div className="space-y-3">
            {procedures
              .filter((procedure) => procedure.evolution_text || procedure.intercurrence_description)
              .map((procedure) => (
                <div key={procedure.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm">
                  <div className="font-semibold text-gray-800 mb-1">
                    {formatDate(procedure.performed_at)} - {procedure.protocol_name || "Aplicacao avulsa"}
                  </div>
                  {procedure.evolution_text && <p className="text-gray-700">{procedure.evolution_text}</p>}
                  {procedure.intercurrence_description && (
                    <p className="text-red-700 mt-2 flex gap-2">
                      <AlertTriangle size={16} /> {procedure.intercurrence_description}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </section>
      )}

      <section className="mb-8 break-inside-avoid">
        <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
          <Package size={20} className="text-orange-700" /> Produtos e materiais consumidos
        </h3>

        {used_items.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Nenhum produto consumido registrado em aplicacoes finalizadas.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-left">
                <th className="p-2 border border-gray-200">Item</th>
                <th className="p-2 border border-gray-200">Tipo</th>
                <th className="p-2 border border-gray-200 text-right">Quantidade</th>
                <th className="p-2 border border-gray-200 text-center">Lotes</th>
              </tr>
            </thead>
            <tbody>
              {used_items.map((item, index) => (
                <tr key={`${item.item_name}-${item.item_type}`} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="p-2 border border-gray-200">{item.item_name}</td>
                  <td className="p-2 border border-gray-200">{item.item_type}</td>
                  <td className="p-2 border border-gray-200 text-right font-bold">{item.total_quantity} {item.unit}</td>
                  <td className="p-2 border border-gray-200 text-center">{item.batches_used}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {used_batches.length > 0 && (
        <section className="mb-8 break-inside-avoid">
          <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4">
            Lotes utilizados
          </h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-left">
                <th className="p-2 border border-gray-200">Item</th>
                <th className="p-2 border border-gray-200">Lote</th>
                <th className="p-2 border border-gray-200">Validade</th>
                <th className="p-2 border border-gray-200 text-right">Quantidade</th>
              </tr>
            </thead>
            <tbody>
              {used_batches.map((batch, index) => (
                <tr key={`${batch.item_name}-${batch.batch_number}-${index}`} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="p-2 border border-gray-200">{batch.item_name}</td>
                  <td className="p-2 border border-gray-200">{batch.batch_number || "-"}</td>
                  <td className="p-2 border border-gray-200">{formatDate(batch.expiration_date)}</td>
                  <td className="p-2 border border-gray-200 text-right font-bold">{batch.total_quantity} {batch.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </ReportDocumentLayout>
  );
}
