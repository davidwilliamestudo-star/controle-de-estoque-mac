import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShoppingCart, AlertCircle, TrendingDown, Clock, Download, Printer } from "lucide-react";
import { purchasePlanningService } from "@/features/inventory/services/purchasePlanning.service";

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function PurchasePlanPage() {
  const planQuery = useQuery({
    queryKey: ["purchase-plan"],
    queryFn: purchasePlanningService.generatePurchasePlan,
  });

  const plan = planQuery.data;

  function renderReasonBadge(reason: string) {
    switch (reason) {
      case "abaixo_minimo":
        return <span className="badge badge-danger gap-1"><TrendingDown size={12} /> Abaixo do mínimo</span>;
      case "lote_vencendo":
        return <span className="badge badge-warning gap-1"><Clock size={12} /> Lote vencendo</span>;
      case "lote_vencido":
        return <span className="badge badge-danger gap-1"><AlertCircle size={12} /> Lote vencido</span>;
      case "critico_sem_fornecedor":
        return <span className="badge badge-warning gap-1"><AlertCircle size={12} /> Sem fornecedor</span>;
      case "consumo_alto":
        return <span className="badge badge-primary gap-1"><TrendingDown size={12} /> Consumo previsto alto</span>;
      default:
        return <span className="badge badge-ghost">{reason}</span>;
    }
  }

  return (
    <div className="flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/reports" className="btn btn-ghost btn-sm mb-2 px-0 text-gray-500 hover:text-gray-900">
            <ArrowLeft size={16} className="mr-1" /> Voltar para Relatórios
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="text-primary" /> Lista de Compras Inteligente
          </h1>
          <p className="text-gray-500">Sugestões de reposição baseadas em estoque, validade e consumo.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={16} className="mr-2" /> Imprimir
          </button>
          <button className="btn btn-primary" onClick={() => planQuery.refetch()} disabled={planQuery.isFetching}>
            {planQuery.isFetching ? "Atualizando..." : "Recalcular Lista"}
          </button>
        </div>
      </div>

      {planQuery.isLoading ? (
        <div className="card">Calculando previsões e sugestões...</div>
      ) : planQuery.isError ? (
        <div className="card text-red-600">Erro ao carregar lista de compras.</div>
      ) : (
        <>
          <div className="grid-3">
            <div className="card">
              <h3 className="text-sm font-medium text-gray-500">Itens Sugeridos</h3>
              <p className="text-3xl font-bold mt-2">{plan?.totalItems || 0}</p>
            </div>
            <div className="card">
              <h3 className="text-sm font-medium text-gray-500">Custo Total Estimado</h3>
              <p className="text-3xl font-bold mt-2">{formatBRL(plan?.totalEstimatedCost || 0)}</p>
            </div>
            <div className="card">
              <h3 className="text-sm font-medium text-gray-500">Última Atualização</h3>
              <p className="text-xl font-bold mt-2">{plan ? new Date(plan.generatedAt).toLocaleString('pt-BR') : '-'}</p>
            </div>
          </div>

          <div className="card">
            {plan?.recommendations.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Seu estoque está perfeito!</h3>
                <p className="text-gray-500 mt-1">Nenhum item precisa de reposição no momento.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Situação do Estoque</th>
                      <th>Motivo(s)</th>
                      <th>Sugestão de Compra</th>
                      <th>Fornecedor Padrão</th>
                      <th className="text-right">Custo Estimado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan?.recommendations.map(rec => (
                      <tr key={rec.inventoryItemId}>
                        <td>
                          <div className="font-medium">{rec.itemName}</div>
                          <div className="text-xs text-gray-500">{rec.itemType === 'medication' ? 'Medicamento' : rec.itemType === 'material' ? 'Material' : 'Equipamento'}</div>
                        </td>
                        <td>
                          <div className="text-sm">Atual: <strong>{rec.currentStock}</strong> {rec.unit}</div>
                          <div className="text-sm text-gray-500">Mínimo: {rec.minimumStock} {rec.unit}</div>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {rec.reasons.map(r => <div key={r}>{renderReasonBadge(r)}</div>)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1" title={rec.reasonDescriptions.join(" | ")}>
                            {rec.reasonDescriptions[0]}
                          </div>
                        </td>
                        <td>
                          <div className="font-bold text-blue-600">{rec.suggestedQuantity} {rec.unit}</div>
                        </td>
                        <td>
                          {rec.defaultSupplierName ? (
                            <span className="text-sm">{rec.defaultSupplierName}</span>
                          ) : (
                            <span className="text-sm text-red-500 flex items-center gap-1"><AlertCircle size={12}/> Não definido</span>
                          )}
                        </td>
                        <td className="text-right font-medium">
                          {rec.totalEstimatedCost > 0 ? formatBRL(rec.totalEstimatedCost) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
