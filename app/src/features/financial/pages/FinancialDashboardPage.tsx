import { Link } from "@tanstack/react-router";
import { 
  Wallet, ArrowUpCircle, ArrowDownCircle, ReceiptText, 
  CreditCard, LineChart, AlertTriangle, TrendingUp, DollarSign, 
  Percent, Users, ShieldAlert, Sparkles, Activity, FileText, CheckCircle2,
  Award, Crown, Medal, ChevronRight
} from "lucide-react";
import { useMemo, useState } from "react";
import { FinancialPeriodFilter, formatBRL, formatPercent } from "../components/FinancialShared";
import { useFinancialDashboard } from "../hooks/useFinancial";
import { financialService } from "../services/financial.service";
import type { FinancialPeriodPreset } from "../types";

export default function FinancialDashboardPage() {
  const [preset, setPreset] = useState<FinancialPeriodPreset>("30d");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const period = useMemo(() => financialService.buildPeriod(preset, customStartDate, customEndDate), [preset, customStartDate, customEndDate]);
  const dashboardQuery = useFinancialDashboard(period);
  const summary = dashboardQuery.data;

  // Max protocol revenue for relative visual progress bars
  const maxProtocolRevenue = useMemo(() => {
    if (!summary?.topProtocols || summary.topProtocols.length === 0) return 1;
    return Math.max(...summary.topProtocols.map(p => p.revenue), 1);
  }, [summary?.topProtocols]);

  // Max patient revenue for relative visual progress bars
  const maxPatientRevenue = useMemo(() => {
    if (!summary?.topPatients || summary.topPatients.length === 0) return 1;
    return Math.max(...summary.topPatients.map(p => p.revenue), 1);
  }, [summary?.topPatients]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── CABEÇALHO DO PAINEL ────────────────────────── */}
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl border flex items-center justify-center shadow-xs bg-emerald-50 border-emerald-200 text-emerald-700"
            >
              <Wallet size={26} />
            </div>
            <div>
              <h1 className="page-title text-2xl font-bold tracking-tight text-slate-900">
                Painel Financeiro
              </h1>
              <p className="page-subtitle text-xs text-slate-500 font-medium mt-0.5">
                Levantamento mensal de custos de insumos, seringas, agulhas e margem dos procedimentos.
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Ação com visual ultra-moderno e limpo */}
        <div className="flex flex-wrap gap-2">
          <Link 
            to="/financial/receivables" 
            className="btn flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all border shadow-xs bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800"
          >
            <ArrowUpCircle size={15} className="text-emerald-200" /> Contas a Receber
          </Link>
          <Link 
            to="/financial/payables" 
            className="btn flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all border shadow-xs bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          >
            <ArrowDownCircle size={15} className="text-slate-500" /> Contas a Pagar
          </Link>
          <Link 
            to="/financial/cash-flow" 
            className="btn flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all border shadow-xs bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          >
            <LineChart size={15} className="text-emerald-600" /> Fluxo de Caixa
          </Link>
          <Link 
            to="/financial/reports" 
            className="btn flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all border shadow-xs bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          >
            <FileText size={15} className="text-emerald-600" /> Relatórios & Custos
          </Link>
        </div>
      </div>

      {/* ── FILTRO DE PERÍODO ────────────────────────── */}
      <FinancialPeriodFilter
        preset={preset}
        startDate={period.startDate}
        endDate={period.endDate}
        onPresetChange={setPreset}
        onDateChange={(field, value) => field === "startDate" ? setCustomStartDate(value) : setCustomEndDate(value)}
      />

      {dashboardQuery.isLoading || !summary ? (
        <div 
          className="card p-12 flex flex-col items-center justify-center text-center gap-3 rounded-2xl border bg-white border-slate-200 shadow-sm"
        >
          <div 
            className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"
          ></div>
          <p className="text-sm text-slate-500 font-medium">Calculando levantamento de estoque e faturamento...</p>
        </div>
      ) : (
        <>
          {/* ── LINHA 1: LEVANTAMENTO DE INSUMOS E CUSTOS MENSIAIS ────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: Custo Total de Insumos */}
            <div 
              className="card p-5 relative overflow-hidden border-l-4 rounded-2xl shadow-xs transition-all hover:shadow-md bg-white border-slate-200 border-l-emerald-600"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Gasto com Insumos</span>
                <div 
                  className="p-2 rounded-xl bg-emerald-50 text-emerald-700"
                >
                  <DollarSign size={18} />
                </div>
              </div>
              <div className="text-2xl font-bold mt-2 text-emerald-800">
                {formatBRL(summary.procedureCost)}
              </div>
              <div className="text-xs font-medium mt-2 flex items-center justify-between text-slate-500">
                <span>Substâncias: {formatBRL(summary.medicationCost)}</span>
                <span>Materiais: {formatBRL(summary.materialCost)}</span>
              </div>
            </div>

            {/* KPI 2: Faturamento dos Procedimentos */}
            <div 
              className="card p-5 relative overflow-hidden border-l-4 rounded-2xl shadow-xs transition-all hover:shadow-md bg-white border-slate-200 border-l-teal-500"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Faturamento Bruto</span>
                <div 
                  className="p-2 rounded-xl bg-teal-50 text-teal-700"
                >
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="text-2xl font-bold mt-2 text-slate-900">
                {formatBRL(summary.revenueTotal)}
              </div>
              <div className="text-xs font-medium mt-2 flex items-center justify-between text-emerald-700">
                <span className="font-semibold text-slate-500">Sobra estimada:</span>
                <span className="font-bold">{formatBRL(summary.grossProfit)}</span>
              </div>
            </div>

            {/* KPI 3: Seringas Consumidas */}
            <div 
              className="card p-5 relative overflow-hidden border-l-4 rounded-2xl shadow-xs transition-all hover:shadow-md bg-white border-slate-200 border-l-sky-500"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Seringas no Mês</span>
                <div 
                  className="p-2 rounded-xl bg-sky-50 text-sky-700"
                >
                  <ReceiptText size={18} />
                </div>
              </div>
              <div className="text-2xl font-bold mt-2 text-slate-900">
                {summary.totalSyringes} <span className="text-xs font-normal text-slate-500">unidades</span>
              </div>
              <div className="text-xs font-medium mt-2 text-slate-500 truncate">
                3ml: {summary.syringesBreakdown.ml3} · 5ml: {summary.syringesBreakdown.ml5} · 10ml: {summary.syringesBreakdown.ml10}
              </div>
            </div>

            {/* KPI 4: Agulhas Consumidas */}
            <div 
              className="card p-5 relative overflow-hidden border-l-4 rounded-2xl shadow-xs transition-all hover:shadow-md bg-white border-slate-200 border-l-indigo-500"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Agulhas no Mês</span>
                <div 
                  className="p-2 rounded-xl bg-indigo-50 text-indigo-700"
                >
                  <Wallet size={18} />
                </div>
              </div>
              <div className="text-2xl font-bold mt-2 text-slate-900">
                {summary.totalNeedles} <span className="text-xs font-normal text-slate-500">unidades</span>
              </div>
              <div className="text-xs font-medium mt-2 text-slate-500">
                Consumidas nas aplicações do período
              </div>
            </div>

          </div>

          {/* ── LINHA 2: MARGEM E EFICIÊNCIA CLÍNICA ────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* KPI 5: Sobra Líquida Insumos */}
            <div 
              className="card p-5 relative overflow-hidden border-l-4 rounded-2xl shadow-xs transition-all hover:shadow-md bg-white border-slate-200 border-l-emerald-600"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sobra Líquida Insumos</span>
                <div 
                  className="p-2 rounded-xl bg-emerald-50 text-emerald-700"
                >
                  <DollarSign size={18} />
                </div>
              </div>
              <div className="text-2xl font-bold mt-2 text-emerald-700">
                {formatBRL(summary.grossProfit)}
              </div>
              <div className="text-xs font-medium mt-2 flex items-center justify-between text-slate-500">
                <span>Gasto de Estoque:</span>
                <span className="font-semibold text-rose-600">{formatBRL(summary.procedureCost)}</span>
              </div>
            </div>

            {/* KPI 6: Margem de Lucro % */}
            <div 
              className="card p-5 relative overflow-hidden border-l-4 rounded-2xl shadow-xs transition-all hover:shadow-md bg-white border-slate-200 border-l-teal-500"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Margem de Lucro</span>
                <div 
                  className="p-2 rounded-xl bg-teal-50 text-teal-700"
                >
                  <Percent size={18} />
                </div>
              </div>
              <div className="text-2xl font-bold mt-2 text-slate-900">
                {formatPercent(summary.grossMargin)}
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500 bg-emerald-600" 
                  style={{ width: `${Math.min(100, Math.max(0, summary.grossMargin))}%` }}
                />
              </div>
            </div>

            {/* KPI 7: Ticket Médio */}
            <div 
              className="card p-5 relative overflow-hidden border-l-4 rounded-2xl shadow-xs transition-all hover:shadow-md bg-white border-slate-200 border-l-slate-400"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ticket Médio</span>
                <div 
                  className="p-2 rounded-xl bg-slate-100 text-slate-700"
                >
                  <Activity size={18} />
                </div>
              </div>
              <div className="text-2xl font-bold mt-2 text-slate-900">
                {formatBRL(summary.averageTicket)}
              </div>
              <div className="text-xs font-medium mt-2 text-slate-500">
                Valor médio por procedimento
              </div>
            </div>

            {/* KPI 8: Itens sem Custo */}
            <div 
              className="card p-5 relative overflow-hidden border-l-4 rounded-2xl shadow-xs transition-all hover:shadow-md bg-white border-slate-200 border-l-amber-500"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Itens s/ Custo</span>
                <div 
                  className="p-2 rounded-xl bg-amber-50 text-amber-700"
                >
                  <AlertTriangle size={18} />
                </div>
              </div>
              <div className="text-2xl font-bold mt-2 text-slate-900">
                {summary.itemsWithoutCostCount} {summary.itemsWithoutCostCount === 1 ? "item" : "itens"}
              </div>
              <div className="text-xs font-semibold mt-2 text-amber-700">
                Cadastre o preço de custo no estoque
              </div>
            </div>

          </div>

          {/* ── LINHA 3: TABELAS DETALHADAS COM PROGRESS BARS ────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Tabela de Protocolos mais Rentáveis */}
            <div 
              className="card p-6 flex flex-col justify-between rounded-2xl shadow-xs border bg-white border-slate-200"
            >
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <div>
                    <h3 className="card-title text-base font-bold flex items-center gap-2 text-slate-900">
                      <Sparkles size={18} className="text-emerald-600" /> Protocolos Mais Rentáveis
                    </h3>
                    <p className="card-description text-xs text-slate-500 mt-0.5">
                      Receita, custos de estoque e margem de lucro por protocolo.
                    </p>
                  </div>
                  <Link 
                    to="/financial/reports" 
                    className="text-xs font-bold hover:underline flex items-center gap-1 text-emerald-700"
                  >
                    Ver todos <ChevronRight size={14} />
                  </Link>
                </div>

                <div className="space-y-4">
                  {summary.topProtocols.length === 0 ? (
                    <div className="text-sm text-slate-400 py-8 text-center">
                      Nenhum procedimento finalizado com receita no período selecionado.
                    </div>
                  ) : (
                    summary.topProtocols.map((protocol, index) => {
                      const barPercent = Math.round((protocol.revenue / maxProtocolRevenue) * 100);
                      const isHighMargin = protocol.marginPercent >= 60;
                      return (
                        <div key={protocol.id || protocol.name} className="flex flex-col gap-1.5 p-3 rounded-xl transition-colors hover:bg-slate-50 border border-transparent hover:border-slate-100">
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2 font-semibold text-slate-900">
                              <span className="text-xs font-bold text-slate-400 w-5">0{index + 1}</span>
                              <span className="truncate max-w-[200px]">{protocol.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span 
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isHighMargin 
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                Margem {formatPercent(protocol.marginPercent)}
                              </span>
                              <span className="font-bold text-slate-900">{formatBRL(protocol.margin)}</span>
                            </div>
                          </div>

                          {/* Progress bar visual em verde esmeralda */}
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                            <div 
                              className="h-full rounded-full transition-all duration-500 bg-emerald-600" 
                              style={{ width: `${barPercent}%` }}
                            />
                          </div>

                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Receita: {formatBRL(protocol.revenue)}</span>
                            <span>Custo: {formatBRL(protocol.cost)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Tabela de Pacientes com Maior Faturamento */}
            <div 
              className="card p-6 flex flex-col justify-between rounded-2xl shadow-xs border bg-white border-slate-200"
            >
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <div>
                    <h3 className="card-title text-base font-bold flex items-center gap-2 text-slate-900">
                      <Users size={18} className="text-emerald-600" /> Pacientes Destaque em Faturamento
                    </h3>
                    <p className="card-description text-xs text-slate-500 mt-0.5">
                      Soma total de recebimentos vinculados por paciente.
                    </p>
                  </div>
                  <Link 
                    to="/patients" 
                    className="text-xs font-bold hover:underline flex items-center gap-1 text-emerald-700"
                  >
                    Ver pacientes <ChevronRight size={14} />
                  </Link>
                </div>

                <div className="space-y-4">
                  {summary.topPatients.length === 0 ? (
                    <div className="text-sm text-slate-400 py-8 text-center">
                      Nenhum paciente com faturamento registrado no período selecionado.
                    </div>
                  ) : (
                    summary.topPatients.map((patient, index) => {
                      const barPercent = Math.round((patient.revenue / maxPatientRevenue) * 100);
                      return (
                        <div key={patient.id || patient.name} className="flex flex-col gap-1.5 p-3 rounded-xl transition-colors hover:bg-slate-50 border border-transparent hover:border-slate-100">
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2.5 font-semibold text-slate-900">
                              {index === 0 ? (
                                <Crown size={15} className="text-amber-500" />
                              ) : index === 1 ? (
                                <Award size={15} className="text-slate-400" />
                              ) : index === 2 ? (
                                <Medal size={15} className="text-amber-700" />
                              ) : (
                                <span className="text-xs font-bold text-slate-400 w-4">0{index + 1}</span>
                              )}
                              <span className="truncate max-w-[180px] font-semibold">{patient.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-rose-600 font-medium">Insumos: {formatBRL(patient.procedureCost)}</span>
                              <span className="font-bold text-emerald-700">{formatBRL(patient.revenue)}</span>
                            </div>
                          </div>

                          {/* Progress bar visual em azul teal */}
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500 bg-teal-500" 
                              style={{ width: `${barPercent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* ── LINHA 4: ALERTAS E SAÚDE FINANCEIRA ────────────────────────── */}
          <div 
            className="card p-6 rounded-2xl shadow-xs border bg-white border-slate-200"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h3 className="card-title text-base font-bold flex items-center gap-2 text-slate-900">
                  <ShieldAlert size={18} className="text-emerald-600" /> Alertas e Saúde Financeira da Clínica
                </h3>
                <p className="card-description text-xs text-slate-500 mt-0.5">
                  Notificações preventivas sobre recebimentos, vencimentos e custos de estoque.
                </p>
              </div>
            </div>

            {summary.alerts.length === 0 ? (
              <div 
                className="flex items-center gap-3 p-4 rounded-xl border bg-emerald-50/60 border-emerald-200 text-emerald-800"
              >
                <CheckCircle2 size={22} className="text-emerald-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">Tudo em dia!</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Não existem pendências financeiras críticas ou contas vencidas no momento.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {summary.alerts.map(alert => (
                  <div 
                    key={alert.title} 
                    className={`p-4 rounded-xl border-l-4 border flex flex-col justify-between ${
                      alert.tone === "danger" 
                        ? "bg-rose-50/50 border-rose-200 border-l-rose-600" 
                        : "bg-amber-50/50 border-amber-200 border-l-amber-500"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                        <AlertTriangle size={16} className={alert.tone === "danger" ? "text-rose-600" : "text-amber-500"} />
                        {alert.title}
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
