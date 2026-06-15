import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTraceabilityReport } from "../../hooks/useReports";
import { ReportDocumentLayout } from "../ReportDocumentLayout";

interface Props {
  batchNumber: string;
}

export function TraceabilityReport({ batchNumber }: Props) {
  const { data: traces = [], isLoading } = useTraceabilityReport(batchNumber, !!batchNumber);

  if (!batchNumber) {
    return <div className="p-8 text-center text-gray-500">Digite um número de lote para buscar.</div>;
  }

  if (isLoading) return <div className="p-8 text-center">Buscando rastreabilidade...</div>;

  return (
    <ReportDocumentLayout 
      title="Rastreabilidade de Lote (ANVISA)" 
      subtitle={`Resultados para o lote: ${batchNumber}`}
    >
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-sm text-blue-800">
        <strong>Nota:</strong> Este relatório lista todos os pacientes que receberam aplicações 
        contendo qualquer item proveniente do lote pesquisado, garantindo conformidade com regras de rastreabilidade.
      </div>

      <table className="table">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Data da Aplicação</th>
            <th className="text-left text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Paciente</th>
            <th className="text-left text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Item Utilizado</th>
            <th className="text-left text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Protocolo</th>
            <th className="text-right text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Qtd. Utilizada</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {traces.map((trace) => (
            <tr key={`${trace.procedure_id}-${trace.item_name}`}>
              <td className="py-3 text-sm text-gray-500">{format(new Date(trace.performed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</td>
              <td className="py-3 text-sm font-bold text-gray-900">{trace.patient_name}</td>
              <td className="py-3 text-sm font-medium">{trace.item_name}</td>
              <td className="py-3 text-sm text-gray-500">{trace.protocol_name || 'Aplicação Avulsa'}</td>
              <td className="py-3 text-sm text-right font-bold text-gray-700">
                {trace.quantity_used} <span className="text-xs font-normal text-gray-500">{trace.control_unit}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {traces.length === 0 && (
        <div className="text-center text-gray-500 py-10 border border-dashed rounded-lg mt-4">
          Nenhum paciente encontado para o lote informado.
        </div>
      )}
    </ReportDocumentLayout>
  );
}
