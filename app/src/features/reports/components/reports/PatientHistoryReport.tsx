import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePatientHistoryReport } from "../../hooks/useReports";
import { ReportDocumentLayout } from "../ReportDocumentLayout";
import type { ReportFilter } from "../../schemas/report.schema";

interface Props {
  filter: ReportFilter;
}

export function PatientHistoryReport({ filter }: Props) {
  const { data: history = [], isLoading } = usePatientHistoryReport(filter, true);

  if (isLoading) return <div className="p-8 text-center">Carregando histórico...</div>;

  const subtitle = `Atendimentos de ${filter.startDate ? format(new Date(filter.startDate), "dd/MM/yy") : "Início"} até ${filter.endDate ? format(new Date(filter.endDate), "dd/MM/yy") : "Hoje"}`;

  return (
    <ReportDocumentLayout 
      title="Histórico Geral de Aplicações" 
      subtitle={subtitle}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card text-center bg-indigo-50 border-none">
          <h4 className="text-indigo-800 text-sm uppercase">Total de Atendimentos</h4>
          <p className="text-3xl font-bold text-indigo-900">{history.length}</p>
        </div>
        <div className="card text-center bg-red-50 border-none">
          <h4 className="text-red-800 text-sm uppercase">Com Intercorrência</h4>
          <p className="text-3xl font-bold text-red-900">{history.filter(h => h.had_intercurrence).length}</p>
        </div>
      </div>

      <table className="table mt-4">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Data</th>
            <th className="text-left text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Paciente</th>
            <th className="text-left text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Protocolo</th>
            <th className="text-left text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Área Tratada</th>
            <th className="text-center text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Itens Usados</th>
            <th className="text-center text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Alertas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {history.map((row) => (
            <tr key={row.procedure_id}>
              <td className="py-3 text-sm text-gray-500">{format(new Date(row.performed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</td>
              <td className="py-3 text-sm font-bold text-gray-900">{row.patient_name}</td>
              <td className="py-3 text-sm font-medium">{row.protocol_name || "Procedimento Avulso"}</td>
              <td className="py-3 text-sm text-gray-500">{row.body_area_name || "-"}</td>
              <td className="py-3 text-sm text-center font-bold text-gray-700">{row.total_items_used}</td>
              <td className="py-3 text-sm text-center">
                {row.had_intercurrence && (
                  <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full print:border print:border-red-300">
                    Intercorrência
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {history.length === 0 && (
        <div className="text-center text-gray-500 py-10 border border-dashed rounded-lg mt-4">
          Nenhuma aplicação foi finalizada no período selecionado.
        </div>
      )}
    </ReportDocumentLayout>
  );
}
