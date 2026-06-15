import { notificationsService } from "@/features/notifications/services/notifications.service";
import { dashboardRepository } from "../repositories/dashboard.repository";
import type { DashboardData, DashboardKpi, DashboardPeriod } from "../types/dashboard.types";

function kpi(id: string, label: string, value: number | string, helper: string, tone: DashboardKpi["tone"]): DashboardKpi {
  return { id, label, value, helper, tone };
}

export const dashboardService = {
  async getDashboardData(period: DashboardPeriod): Promise<DashboardData> {
    await notificationsService.generateOperationalNotifications();

    const [
      summary,
      procedureTrend,
      consumptionByType,
      topProtocols,
      routeDistribution,
      stockByCategory,
      expirationBuckets,
      alertsBySeverity,
      recentActivity,
      alerts,
    ] = await Promise.all([
      dashboardRepository.getSummary(period),
      dashboardRepository.getProcedureTrend(period),
      dashboardRepository.getConsumptionByType(period),
      dashboardRepository.getTopProtocols(period),
      dashboardRepository.getRouteDistribution(period),
      dashboardRepository.getStockByCategory(),
      dashboardRepository.getExpirationBuckets(),
      dashboardRepository.getAlertsBySeverity(),
      dashboardRepository.getRecentActivity(),
      dashboardRepository.getOperationalAlerts(),
    ]);

    const kpis = [
      kpi("procedures", "Aplicacoes no periodo", summary.procedures_total, `${summary.procedures_today} hoje`, "info"),
      kpi("patients", "Pacientes ativos", summary.active_patients, `${summary.new_patients} novos no periodo`, "success"),
      kpi("stock", "Itens em estoque", summary.inventory_items, `${summary.low_stock_items + summary.out_stock_items} exigem atencao`, summary.out_stock_items > 0 ? "danger" : summary.low_stock_items > 0 ? "warning" : "neutral"),
      kpi("batches", "Lotes criticos", summary.expired_batches + summary.expiring_batches, `${summary.expired_batches} vencidos e ${summary.expiring_batches} a vencer`, summary.expired_batches > 0 ? "danger" : summary.expiring_batches > 0 ? "warning" : "success"),
      kpi("protocols", "Protocolos ativos", summary.active_protocols, `${summary.pending_procedures} aplicacoes pendentes`, summary.pending_procedures > 0 ? "warning" : "neutral"),
      kpi("labels", "Etiquetas geradas", summary.labels_generated, "Dentro do periodo selecionado", "neutral"),
      kpi("sync", "Falhas de sincronizacao", summary.sync_failures, "Agenda e integracoes", summary.sync_failures > 0 ? "warning" : "success"),
      kpi("alerts", "Alertas abertos", alerts.length, "Itens operacionais nao resolvidos", alerts.some(alert => alert.severity === "critical") ? "danger" : alerts.length > 0 ? "warning" : "success"),
    ];

    return {
      period,
      kpis,
      procedureTrend,
      consumptionByType,
      topProtocols,
      routeDistribution,
      stockByCategory,
      expirationBuckets,
      alertsBySeverity,
      recentActivity,
      alerts,
    };
  },
};
