import { BarChart3, FileText, Download, Users, Layers, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { FinancialPeriodFilter, formatBRL, formatPercent } from "../components/FinancialShared";
import { useFinancialReports } from "../hooks/useFinancial";
import { financialService } from "../services/financial.service";
import type { FinancialPeriodPreset } from "../types";

function downloadCsv(filename: string, content: string) {
  if (!content) return;
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FinancialReportsPage() {
  const [preset, setPreset] = useState<FinancialPeriodPreset>("this_month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const period = useMemo(
    () => financialService.buildPeriod(preset, customStartDate, customEndDate),
    [preset, customStartDate, customEndDate],
  );
  const reportsQuery = useFinancialReports(period);
  const data = reportsQuery.data;

  function handleExport(section: "protocols" | "patients" | "expenses") {
    if (!data) return;
    const csv = financialService.exportReportCsv(data, section);
    const labels = { protocols: "protocolos", patients: "pacientes", expenses: "despesas" };
    downloadCsv(`financeiro-${labels[section]}-${period.startDate}-${period.endDate}.csv`, csv);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BarChart3 size={28} /> Relatórios & Levantamento de Custos
          </h1>
          <p className="page-subtitle">
            Custos com insumos por paciente, por protocolo, consumo mensal de estoque e resultado líquido.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!data}
            onClick={() => handleExport("protocols")}
          >
            <Download size={16} /> Protocolos CSV
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!data}
            onClick={() => handleExport("patients")}
          >
            <Download size={16} /> Pacientes CSV
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!data}
            onClick={() => handleExport("expenses")}
          >
            <Download size={16} /> Despesas CSV
          </button>
        </div>
      </div>

      <FinancialPeriodFilter
        preset={preset}
        startDate={period.startDate}
        endDate={period.endDate}
        onPresetChange={setPreset}
        onDateChange={(field, value) =>
          field === "startDate" ? setCustomStartDate(value) : setCustomEndDate(value)
        }
      />

      {reportsQuery.isLoading || !data ? (
        <div className="card p-8 text-center text-sm text-gray-500">Carregando relatórios...</div>
      ) : (
        <>
          {/* DRE / Levantamento de Custos */}
          <div className="card">
            <div className="card-header border-b pb-3 mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileText size={20} /> Demonstrativo de Custos & Resultado
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Faturamento de procedimentos no período · Gasto com insumos de estoque · Despesas pagas
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between border-b py-2">
                  <span className="font-medium text-sm">1. Faturamento dos procedimentos</span>
                  <span className="text-green-700 font-bold">{formatBRL(data.dre.revenue)}</span>
                </div>
                <div className="flex justify-between border-b py-2">
                  <span className="font-medium text-sm text-red-600">
                    (-) Custos de insumos (Estoque)
                  </span>
                  <span className="text-red-700">{formatBRL(data.dre.procedureCosts)}</span>
                </div>
                <div className="flex justify-between border-b py-2 bg-gray-50 px-2 rounded">
                  <span className="font-bold text-sm">= Sobra dos procedimentos</span>
                  <span className="font-bold">{formatBRL(data.dre.grossProfit)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between border-b py-2">
                  <span className="font-medium text-sm text-red-600">
                    (-) Despesas pagas no período
                  </span>
                  <span className="text-red-700">{formatBRL(data.dre.operatingExpenses)}</span>
                </div>
                <div className="flex justify-between border-b py-2 bg-green-50 px-2 rounded">
                  <span className="font-bold text-sm text-green-800">= Sobra líquida final</span>
                  <span className="font-bold text-green-800">{formatBRL(data.dre.netResult)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-4 bg-gray-50 p-4 rounded-xl">
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    Margem bruta
                  </div>
                  <div className="text-3xl font-bold text-blue-600">
                    {formatPercent(data.dre.grossMargin)}
                  </div>
                </div>
                <div className="text-center border-t pt-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    Margem líquida
                  </div>
                  <div className="text-3xl font-bold text-green-600">
                    {formatPercent(data.dre.netMargin)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Por protocolo */}
            <div className="card">
              <h3 className="card-title mb-4 flex items-center gap-2">
                <Layers size={16} /> Custos e receitas por protocolo
              </h3>
              <div className="table-container max-h-[320px] overflow-y-auto">
                <table className="table">
                  <thead className="sticky top-0 bg-white">
                    <tr>
                      <th>Protocolo</th>
                      <th className="text-right">Receita</th>
                      <th className="text-right">Insumos</th>
                      <th className="text-right">Sobra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.revenueByProtocol.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-gray-500">
                          Sem dados no período
                        </td>
                      </tr>
                    ) : (
                      data.revenueByProtocol.map((item) => (
                        <tr key={item.protocol_id || "avulso"}>
                          <td>{item.protocol_name}</td>
                          <td className="text-right">{formatBRL(item.revenue)}</td>
                          <td className="text-right text-red-600">{formatBRL(item.cost)}</td>
                          <td className="text-right font-bold">{formatBRL(item.margin)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Despesas por categoria */}
            <div className="card">
              <h3 className="card-title mb-4 flex items-center gap-2">
                <Wallet size={16} /> Despesas pagas por categoria
              </h3>
              <div className="table-container max-h-[320px] overflow-y-auto">
                <table className="table">
                  <thead className="sticky top-0 bg-white">
                    <tr>
                      <th>Categoria</th>
                      <th className="text-right">Total pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expensesByCategory.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="text-center text-gray-500">
                          Nenhum pagamento de despesa no período
                        </td>
                      </tr>
                    ) : (
                      data.expensesByCategory.map((item) => (
                        <tr key={item.category_id || "sem-categoria"}>
                          <td>{item.category_name}</td>
                          <td className="text-right font-bold text-red-600">
                            {formatBRL(item.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Por paciente */}
          <div className="card">
            <h3 className="card-title mb-4 flex items-center gap-2">
              <Users size={16} /> Levantamento de custos por paciente
            </h3>
            <div className="table-container max-h-[280px] overflow-y-auto">
              <table className="table">
                <thead className="sticky top-0 bg-white">
                  <tr>
                    <th>Paciente</th>
                    <th className="text-right">Faturamento</th>
                    <th className="text-right">Custo Insumos</th>
                    <th className="text-right">Sobra</th>
                  </tr>
                </thead>
                <tbody>
                  {data.revenueByPatient.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-gray-500">
                        Sem dados no período
                      </td>
                    </tr>
                  ) : (
                    data.revenueByPatient.map((item) => (
                      <tr key={item.patient_id || "sem-paciente"}>
                        <td>{item.patient_name}</td>
                        <td className="text-right font-semibold text-gray-900">
                          {formatBRL(item.revenue)}
                        </td>
                        <td className="text-right text-red-600 font-medium">
                          {formatBRL(item.cost)}
                        </td>
                        <td className="text-right font-bold text-[#1A5347]">
                          {formatBRL(item.margin)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Títulos em aberto / vencidos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <OpenList
              title="A receber em aberto"
              rows={data.openReceivables}
              empty="Nenhuma conta em aberto"
              getLabel={(r) => r.patient_name || r.description}
              getAmount={(r) => Number(r.amount) - Number(r.paid_amount || 0)}
            />
            <OpenList
              title="A pagar em aberto"
              rows={data.openPayables}
              empty="Nenhuma conta a pagar em aberto"
              getLabel={(r) => r.supplier_name || r.description}
              getAmount={(r) => Number(r.amount) - Number(r.paid_amount || 0)}
            />
            <OpenList
              title="Recebimentos vencidos"
              rows={data.overdueReceivables}
              empty="Nenhum vencido"
              getLabel={(r) => r.patient_name || r.description}
              getAmount={(r) => Number(r.amount) - Number(r.paid_amount || 0)}
              danger
            />
          </div>
        </>
      )}
    </div>
  );
}

function OpenList({
  title,
  rows,
  empty,
  getLabel,
  getAmount,
  danger,
}: {
  title: string;
  rows: any[];
  empty: string;
  getLabel: (r: any) => string;
  getAmount: (r: any) => number;
  danger?: boolean;
}) {
  return (
    <div className="card">
      <h3 className={`card-title mb-3 text-sm ${danger ? "text-red-700" : ""}`}>{title}</h3>
      <ul className="divide-y max-h-[220px] overflow-y-auto">
        {rows.length === 0 ? (
          <li className="py-4 text-center text-xs text-gray-400">{empty}</li>
        ) : (
          rows.slice(0, 20).map((row) => (
            <li key={row.id} className="flex justify-between gap-2 py-2 text-sm">
              <span className="truncate text-gray-700">{getLabel(row)}</span>
              <span className={`font-semibold shrink-0 ${danger ? "text-red-600" : "text-gray-900"}`}>
                {formatBRL(getAmount(row))}
              </span>
            </li>
          ))
        )}
      </ul>
      {rows.length > 20 && (
        <p className="text-[11px] text-gray-400 mt-2">Exibindo 20 de {rows.length}</p>
      )}
    </div>
  );
}
