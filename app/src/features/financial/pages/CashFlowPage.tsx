import { Wallet, Calendar as CalendarIcon, TrendingUp, TrendingDown, RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { FinancialPeriodFilter, formatBRL } from "../components/FinancialShared";
import { useCashFlow } from "../hooks/useFinancial";
import { financialService } from "../services/financial.service";
import type { CashGroupBy, FinancialPeriodPreset } from "../types";

export default function CashFlowPage() {
  const [preset, setPreset] = useState<FinancialPeriodPreset>("this_month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [groupBy, setGroupBy] = useState<CashGroupBy>("day");

  const period = useMemo(() => financialService.buildPeriod(preset, customStartDate, customEndDate), [preset, customStartDate, customEndDate]);
  const cashFlowQuery = useCashFlow(period, groupBy);
  
  const data = cashFlowQuery.data || [];

  const totalRealizedIncome = data.reduce((acc, row) => acc + row.realizedIncome, 0);
  const totalRealizedExpense = data.reduce((acc, row) => acc + row.realizedExpense, 0);
  const totalProjectedIncome = data.reduce((acc, row) => acc + row.projectedIncome, 0);
  const totalProjectedExpense = data.reduce((acc, row) => acc + row.projectedExpense, 0);
  const finalBalance = data.length > 0 ? data[data.length - 1].accumulatedBalance : 0;

  return (
    <div className="flex-col gap-6">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2"><RefreshCcw size={28} /> Fluxo de Caixa</h1>
          <p className="page-subtitle">Entradas e saídas financeiras ao longo do tempo (realizadas e previstas).</p>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <FinancialPeriodFilter
          preset={preset}
          startDate={period.startDate}
          endDate={period.endDate}
          onPresetChange={setPreset}
          onDateChange={(field, value) => field === "startDate" ? setCustomStartDate(value) : setCustomEndDate(value)}
        />
        
        <div className="flex gap-2">
          <label className="text-sm font-medium text-gray-700 flex items-center">Agrupar por:</label>
          <select 
            className="input max-w-[150px]" 
            value={groupBy} 
            onChange={e => setGroupBy(e.target.value as CashGroupBy)}
          >
            <option value="day">Dia</option>
            <option value="week">Semana</option>
            <option value="month">Mês</option>
          </select>
        </div>
      </div>

      {cashFlowQuery.isLoading ? (
        <div className="card">Carregando fluxo de caixa...</div>
      ) : (
        <>
          <div className="grid-5">
            <MetricCard title="Entradas Realizadas" value={formatBRL(totalRealizedIncome)} icon={<TrendingUp size={20} />} tone="green" />
            <MetricCard title="Saídas Realizadas" value={formatBRL(totalRealizedExpense)} icon={<TrendingDown size={20} />} tone="orange" />
            <MetricCard title="Entradas Previstas" value={formatBRL(totalProjectedIncome)} icon={<TrendingUp size={20} />} tone="blue" />
            <MetricCard title="Saídas Previstas" value={formatBRL(totalProjectedExpense)} icon={<TrendingDown size={20} />} tone="gray" />
            <MetricCard title="Saldo Final" value={formatBRL(finalBalance)} icon={<Wallet size={20} />} tone={finalBalance >= 0 ? "green" : "orange"} />
          </div>

          <div className="card mt-4">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Período</th>
                    <th className="text-right text-green-700">Entradas Realizadas</th>
                    <th className="text-right text-red-700">Saídas Realizadas</th>
                    <th className="text-right text-blue-700">Entradas Previstas</th>
                    <th className="text-right text-gray-700">Saídas Previstas</th>
                    <th className="text-right">Saldo do Período</th>
                    <th className="text-right font-bold">Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-gray-500 py-6">
                        Nenhuma movimentação encontrada para o período.
                      </td>
                    </tr>
                  ) : (
                    data.map((row) => (
                      <tr key={row.period}>
                        <td className="font-medium flex items-center gap-2"><CalendarIcon size={16} className="text-gray-400" /> {row.period}</td>
                        <td className="text-right text-green-700">{formatBRL(row.realizedIncome)}</td>
                        <td className="text-right text-red-700">{formatBRL(row.realizedExpense)}</td>
                        <td className="text-right text-blue-700">{formatBRL(row.projectedIncome)}</td>
                        <td className="text-right text-gray-700">{formatBRL(row.projectedExpense)}</td>
                        <td className="text-right">{formatBRL(row.dailyBalance)}</td>
                        <td className={`text-right font-bold ${row.accumulatedBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {formatBRL(row.accumulatedBalance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ title, value, sub, icon, tone }: { title: string; value: string; sub?: string; icon: React.ReactNode; tone: "green" | "blue" | "orange" | "gray" }) {
  const toneClass = tone === "green" ? "border-l-green-500" : tone === "blue" ? "border-l-blue-500" : tone === "orange" ? "border-l-orange-500" : "border-l-gray-400";
  return (
    <div className={`card summary-card border-l-4 ${toneClass}`}>
      <div className="summary-card-header"><span>{title}</span>{icon}</div>
      <div className="summary-card-value text-xl">{value}</div>
      {sub && <div className="summary-card-subtext">{sub}</div>}
    </div>
  );
}
