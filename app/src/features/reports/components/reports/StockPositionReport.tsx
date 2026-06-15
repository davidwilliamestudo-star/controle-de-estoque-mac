import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStockPositionReport } from "../../hooks/useReports";
import { ReportDocumentLayout } from "../ReportDocumentLayout";
import type { ReportFilter } from "../../schemas/report.schema";

interface Props {
  filter: ReportFilter;
}

export function StockPositionReport({ filter }: Props) {
  const { data: stock = [], isLoading } = useStockPositionReport(filter);

  if (isLoading) return <div className="p-8 text-center">Carregando relatório...</div>;

  let subtitle = "Visão geral de saldos e validades";
  if (filter.itemType === "medication") subtitle += " | Apenas Medicamentos";
  if (filter.itemType === "material") subtitle += " | Apenas Materiais";
  if (filter.categoryId) subtitle += " | Categoria Filtrada";

  return (
    <ReportDocumentLayout title="Posição de Estoque" subtitle={subtitle}>
      <table className="table">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Item</th>
            <th className="text-left text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Categoria</th>
            <th className="text-right text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Saldo</th>
            <th className="text-right text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Mínimo</th>
            <th className="text-center text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Lotes</th>
            <th className="text-center text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Próx. Vencimento</th>
            <th className="text-center text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {stock.map((item) => {
            const isLowStock = item.current_stock < item.minimum_stock;
            const expDate = item.next_expiration_date ? new Date(item.next_expiration_date) : null;
            const isExpired = expDate && expDate < new Date();

            return (
              <tr key={item.item_id}>
                <td className="py-2 text-sm font-medium">{item.item_name}</td>
                <td className="py-2 text-sm text-gray-500">{item.category_name || '-'}</td>
                <td className={`py-2 text-sm text-right font-bold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                  {item.current_stock} <span className="text-xs font-normal text-gray-500">{item.control_unit}</span>
                </td>
                <td className="py-2 text-sm text-right text-gray-500">{item.minimum_stock}</td>
                <td className="py-2 text-sm text-center">{item.active_batches}</td>
                <td className={`py-2 text-sm text-center ${isExpired ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                  {expDate ? format(expDate, "dd/MM/yyyy", { locale: ptBR }) : '-'}
                </td>
                <td className="py-2 text-sm text-center">
                  {isLowStock ? (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full print:border print:border-red-300">Abaixo Min</span>
                  ) : (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full print:border print:border-green-300">Normal</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ReportDocumentLayout>
  );
}
