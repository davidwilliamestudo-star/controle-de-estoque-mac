import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStockMovementsReport } from "../../hooks/useReports";
import type { ReportFilter } from "../../schemas/report.schema";
import { ReportDocumentLayout } from "../ReportDocumentLayout";

interface Props {
  filter: ReportFilter;
}

const typeMap = {
  entry: "Entrada",
  exit: "Saida Manual",
  automatic_exit: "Uso em Paciente",
  adjustment: "Ajuste",
  loss: "Perda",
  expired: "Vencido",
  correction: "Correcao",
};

export function StockMovementsReport({ filter }: Props) {
  const { data: movements = [], isLoading } = useStockMovementsReport(filter, true);

  if (isLoading) return <div className="p-8 text-center">Carregando relatorio...</div>;

  let subtitle = `Periodo: ${filter.startDate ? format(new Date(filter.startDate), "dd/MM/yy") : "Inicio"} ate ${filter.endDate ? format(new Date(filter.endDate), "dd/MM/yy") : "Hoje"}`;
  if (filter.movementType === "entry") subtitle += " | Apenas Entradas";
  if (filter.movementType === "exit") subtitle += " | Apenas Saidas";
  if (filter.movementType === "usage") subtitle += " | Apenas Uso em Pacientes";
  if (filter.itemType === "medication") subtitle += " | Apenas Medicamentos";
  if (filter.itemType === "material") subtitle += " | Apenas Materiais";

  return (
    <ReportDocumentLayout title="Historico de Movimentacoes" subtitle={subtitle}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card text-center bg-gray-50 border-none">
          <h4 className="text-gray-500 text-sm uppercase">Registros</h4>
          <p className="text-3xl font-bold text-gray-900">{movements.length}</p>
        </div>
      </div>

      <table className="table mt-4">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Data/Hora</th>
            <th className="text-left text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Tipo</th>
            <th className="text-left text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Item</th>
            <th className="text-left text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Lote</th>
            <th className="text-right text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Quantidade</th>
            <th className="text-left text-xs text-gray-500 font-bold uppercase tracking-wider py-3">Motivo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {movements.map((mov) => {
            const signedQuantity = Number(mov.control_quantity);
            const isEntry = mov.movement_type === "entry" || (mov.movement_type === "adjustment" && signedQuantity > 0);
            return (
              <tr key={mov.id}>
                <td className="py-2 text-sm text-gray-500">{format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</td>
                <td className="py-2 text-sm text-gray-900">{typeMap[mov.movement_type]}</td>
                <td className="py-2 text-sm font-medium">{mov.item_name}</td>
                <td className="py-2 text-sm text-gray-500">{mov.batch_number || "-"}</td>
                <td className={`py-2 text-sm text-right font-bold ${isEntry ? "text-green-600" : "text-red-600"}`}>
                  {isEntry ? "+" : "-"}{Math.abs(signedQuantity)} <span className="text-xs font-normal text-gray-500">{mov.control_unit}</span>
                </td>
                <td className="py-2 text-sm text-gray-500 italic">{mov.reason || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {movements.length === 0 && (
        <div className="text-center text-gray-500 py-10 border border-dashed rounded-lg mt-4">
          Nenhuma movimentacao encontrada neste periodo.
        </div>
      )}
    </ReportDocumentLayout>
  );
}
