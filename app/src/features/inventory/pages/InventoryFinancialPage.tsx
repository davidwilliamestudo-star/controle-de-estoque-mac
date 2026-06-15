import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { DollarSign, TrendingDown, TrendingUp, AlertCircle, PieChart, Package, CalendarX, ShieldAlert } from "lucide-react";
import { inventoryFinancialService, type InventoryFinancialSummary } from "../services/inventoryFinancial.service";

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export default function InventoryFinancialPage() {
  const [summary, setSummary] = useState<InventoryFinancialSummary | null>(null);
  const [itemsNoCost, setItemsNoCost] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sumData, noCostData] = await Promise.all([
        inventoryFinancialService.getDashboardSummary(30),
        inventoryFinancialService.getItemsWithoutCost()
      ]);
      setSummary(sumData);
      setItemsNoCost(noCostData);
    } catch (error) {
      console.error("Erro ao carregar dados financeiros", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !summary) {
    return (
      <div className="page-container h-full flex flex-col justify-center items-center">
        <div className="animate-spin w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent mb-4" />
        <p className="text-gray-500">Calculando valores financeiros do estoque...</p>
      </div>
    );
  }

  return (
    <div className="page-container h-full flex flex-col overflow-y-auto">
      <div className="page-header shrink-0 mb-6">
        <div>
          <h1 className="page-title flex items-center">
            <DollarSign className="mr-2 text-green-600" size={28} />
            Painel Financeiro do Estoque
          </h1>
          <p className="page-subtitle">Visão executiva de valores, consumo e perdas (Últimos 30 dias)</p>
        </div>
        <div className="flex gap-2">
          <Link to="/inventory" search={{ success: undefined }} className="btn btn-secondary">
            Voltar ao Estoque
          </Link>
          <button className="btn btn-secondary" onClick={loadData}>Atualizar</button>
        </div>
      </div>

      {/* Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-5 border-l-4 border-l-green-500 shadow-sm flex flex-col justify-between bg-white">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Valor Parado em Estoque</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatBRL(summary.totalValue)}</h3>
            </div>
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <Package size={20} />
            </div>
          </div>
          <p className="text-xs text-gray-400">Total do saldo atual x último custo</p>
        </div>

        <div className="card p-5 border-l-4 border-l-blue-500 shadow-sm flex flex-col justify-between bg-white">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Custo Consumido (30d)</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatBRL(summary.consumptionCost)}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <TrendingDown size={20} />
            </div>
          </div>
          <p className="text-xs text-gray-400">Total de saídas normais de itens</p>
        </div>

        <div className="card p-5 border-l-4 border-l-red-500 shadow-sm flex flex-col justify-between bg-white">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Perdas Estimadas (30d)</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatBRL(summary.estimatedLossesValue)}</h3>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <CalendarX size={20} />
            </div>
          </div>
          <p className="text-xs text-gray-400">Lotes que vencem em 30 dias</p>
        </div>

        <div className="card p-5 border-l-4 border-l-orange-500 shadow-sm flex flex-col justify-between bg-white">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Custo de Reposição Estimado</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatBRL(summary.replacementCost)}</h3>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="text-xs text-gray-400">Para atingir o estoque mínimo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gráfico 1: Valor por Tipo */}
        <div className="card shadow-sm bg-white p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
            <PieChart size={18} className="mr-2 text-gray-400" />
            Valor em Estoque por Tipo
          </h3>
          <div className="space-y-4">
            {Object.entries(summary.valueByType).length === 0 ? (
              <p className="text-gray-500 text-sm">Sem dados suficientes.</p>
            ) : (
              Object.entries(summary.valueByType).sort((a,b) => b[1] - a[1]).map(([type, value]) => {
                const percent = summary.totalValue > 0 ? (value / summary.totalValue) * 100 : 0;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 capitalize">
                        {type === 'medication' ? 'Medicamentos' : 
                         type === 'material' ? 'Materiais' : 
                         type === 'equipment' ? 'Equipamentos' : type}
                      </span>
                      <span className="font-bold text-gray-900">{formatBRL(value)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Gráfico 2: Valor por Categoria */}
        <div className="card shadow-sm bg-white p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
            <PieChart size={18} className="mr-2 text-gray-400" />
            Top 5 Categorias (Valor Parado)
          </h3>
          <div className="space-y-4">
            {Object.entries(summary.valueByCategory).length === 0 ? (
              <p className="text-gray-500 text-sm">Sem dados suficientes.</p>
            ) : (
              Object.entries(summary.valueByCategory)
                .sort((a,b) => b[1] - a[1])
                .slice(0, 5)
                .map(([category, value]) => {
                const percent = summary.totalValue > 0 ? (value / summary.totalValue) * 100 : 0;
                return (
                  <div key={category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 truncate pr-4">{category}</span>
                      <span className="font-bold text-gray-900 shrink-0">{formatBRL(value)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Alertas - Itens Sem Preço */}
      <div className="card shadow-sm bg-white overflow-hidden mb-8">
        <div className="p-4 border-b border-gray-100 bg-orange-50 flex items-center">
          <ShieldAlert className="text-orange-600 mr-3" size={24} />
          <div>
            <h3 className="text-base font-semibold text-orange-800">Itens Ativos sem Custo Cadastrado</h3>
            <p className="text-sm text-orange-600">
              Existem {itemsNoCost.length} itens com saldo em estoque mas que não possuem valor de compra registrado. Eles estão contabilizados como R$ 0,00.
            </p>
          </div>
        </div>
        
        {itemsNoCost.length > 0 && (
          <div className="max-h-64 overflow-y-auto">
            <table className="table w-full">
              <thead className="bg-white sticky top-0">
                <tr>
                  <th>Nome do Item</th>
                  <th>Saldo Atual</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {itemsNoCost.map(item => (
                  <tr key={item.id}>
                    <td className="font-medium text-gray-900">{item.name}</td>
                    <td>{item.current_stock} {item.unit}</td>
                    <td>
                      <Link to={`/inventory`} search={{ success: undefined }} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Ir para Estoque
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
