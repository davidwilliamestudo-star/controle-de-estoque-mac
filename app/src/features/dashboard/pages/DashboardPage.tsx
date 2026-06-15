import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { dashboardService } from "../services/dashboard.service";
import type { DashboardPeriod, DashboardPeriodPreset } from "../types/dashboard.types";
import { DashboardAlertsPanel } from "../components/DashboardAlertsPanel";
import { DashboardChartCard } from "../components/DashboardChartCard";
import { DashboardHeader } from "../components/DashboardHeader";
import { DashboardKpiGrid } from "../components/DashboardKpiGrid";
import { DashboardQuickActions } from "../components/DashboardQuickActions";
import { DashboardRecentActivity } from "../components/DashboardRecentActivity";

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function buildPeriod(preset: DashboardPeriodPreset, customStartDate: string, customEndDate: string): DashboardPeriod {
  const today = new Date();
  const end = new Date(today);
  const start = new Date(today);

  if (preset === "today") {
    return { preset, startDate: isoDate(today), endDate: isoDate(today) };
  }

  if (preset === "7d") {
    start.setDate(today.getDate() - 6);
    return { preset, startDate: isoDate(start), endDate: isoDate(end) };
  }

  if (preset === "this_month") {
    return { preset, startDate: isoDate(startOfMonth(today)), endDate: isoDate(endOfMonth(today)) };
  }

  if (preset === "previous_month") {
    const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return { preset, startDate: isoDate(startOfMonth(previousMonth)), endDate: isoDate(endOfMonth(previousMonth)) };
  }

  if (preset === "custom") {
    return { preset, startDate: customStartDate || isoDate(today), endDate: customEndDate || isoDate(today) };
  }

  start.setDate(today.getDate() - 29);
  return { preset: "30d", startDate: isoDate(start), endDate: isoDate(end) };
}

export default function DashboardPage() {
  const [preset, setPreset] = useState<DashboardPeriodPreset>("30d");
  const defaultPeriod = useMemo(() => buildPeriod("30d", "", ""), []);
  const [customStartDate, setCustomStartDate] = useState(defaultPeriod.startDate);
  const [customEndDate, setCustomEndDate] = useState(defaultPeriod.endDate);
  const period = useMemo(() => buildPeriod(preset, customStartDate, customEndDate), [preset, customStartDate, customEndDate]);

  const query = useQuery({
    queryKey: ["dashboard", period],
    queryFn: () => dashboardService.getDashboardData(period),
  });

  function handleCustomDateChange(field: "startDate" | "endDate", value: string) {
    if (field === "startDate") setCustomStartDate(value);
    else setCustomEndDate(value);
  }

  if (query.isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="splash-loader" style={{ borderTopColor: "var(--color-green-deep)", borderColor: "var(--color-gray-200)" }} />
        <span>Carregando indicadores reais...</span>
      </div>
    );
  }

  if (query.error || !query.data) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><AlertTriangle /></div>
        <div className="empty-state-title">Nao foi possivel carregar o dashboard</div>
        <div className="empty-state-description">{query.error instanceof Error ? query.error.message : "Tente atualizar novamente."}</div>
        <button className="btn btn-primary" onClick={() => query.refetch()}>Tentar novamente</button>
      </div>
    );
  }

  const data = query.data;

  return (
    <div className="dashboard-page">
      <DashboardHeader
        preset={preset}
        startDate={customStartDate}
        endDate={customEndDate}
        isRefreshing={query.isFetching}
        onPresetChange={setPreset}
        onCustomDateChange={handleCustomDateChange}
        onRefresh={() => query.refetch()}
      />

      <DashboardKpiGrid kpis={data.kpis} />

      <div className="dashboard-layout-grid">
        <DashboardChartCard
          title="Aplicacoes por dia"
          description="Procedimentos registrados no periodo selecionado."
          data={data.procedureTrend}
          type="line"
        />
        <DashboardChartCard
          title="Consumo por tipo"
          description="Somatorio de itens utilizados em procedimentos."
          data={data.consumptionByType}
          type="pie"
        />
        <DashboardChartCard
          title="Protocolos mais usados"
          description="Top protocolos por volume de aplicacoes."
          data={data.topProtocols}
        />
        <DashboardChartCard
          title="Rotas de administracao"
          description="Distribuicao por rota associada ao protocolo."
          data={data.routeDistribution}
          type="pie"
        />
        <DashboardChartCard
          title="Estoque por categoria"
          description="Itens ativos agrupados pela categoria cadastrada."
          data={data.stockByCategory}
        />
        <DashboardChartCard
          title="Validade dos lotes"
          description="Lotes com quantidade disponivel por faixa de vencimento."
          data={data.expirationBuckets}
        />
      </div>

      <div className="dashboard-bottom-grid">
        <DashboardAlertsPanel alerts={data.alerts} />
        <DashboardRecentActivity activities={data.recentActivity} />
        <DashboardQuickActions />
      </div>
    </div>
  );
}
