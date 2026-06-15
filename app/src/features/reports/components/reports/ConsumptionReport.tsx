import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useConsumptionReport } from "../../hooks/useReports";
import { ReportDocumentLayout } from "../ReportDocumentLayout";
import type { ReportFilter } from "../../schemas/report.schema";

interface Props {
  filter: ReportFilter;
}

export function ConsumptionReport({ filter }: Props) {
  const { data: consumption = [], isLoading } = useConsumptionReport(filter, true);

  if (isLoading) return <div className="p-8 text-center">Carregando relatório...</div>;

  return (
    <ReportDocumentLayout 
      title="Consumo por Período" 
      subtitle={`Período: ${filter.startDate ? format(new Date(filter.startDate), "dd/MM/yy") : "Início"} até ${filter.endDate ? format(new Date(filter.endDate), "dd/MM/yy") : "Hoje"}`}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Sumário */}
        <div className="card text-center bg-gray-50 border-none">
          <h4 className="text-gray-500 text-sm uppercase">Total de Itens Diferentes</h4>
          <p className="text-3xl font-bold text-gray-900">{consumption.length}</p>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Item Consumido</th>
            <th className="text-right text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Quantidade Total Debitada</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {consumption.map((item) => (
            <tr key={item.item_id}>
              <td className="py-3 text-sm font-medium">{item.item_name}</td>
              <td className="py-3 text-sm text-right font-bold text-red-600">
                {item.total_consumed} <span className="text-xs font-normal text-gray-500">{item.control_unit}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {consumption.length === 0 && (
        <div className="text-center text-gray-500 py-10 border border-dashed rounded-lg mt-4">
          Nenhum consumo registrado neste período.
        </div>
      )}
    </ReportDocumentLayout>
  );
}
