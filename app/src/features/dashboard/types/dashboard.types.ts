export type DashboardPeriodPreset = "today" | "7d" | "30d" | "this_month" | "previous_month" | "custom";

export interface DashboardPeriod {
  preset: DashboardPeriodPreset;
  startDate: string;
  endDate: string;
}

export interface DashboardKpi {
  id: string;
  label: string;
  value: number | string;
  helper: string;
  tone: "neutral" | "success" | "warning" | "danger" | "info";
}

export interface ChartDatum {
  name: string;
  value: number;
  secondaryValue?: number;
}

export interface DashboardAlert {
  id: string;
  title: string;
  message: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  createdAt?: string | null;
}

export interface DashboardActivity {
  id: string;
  action: string;
  description: string;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
}

export interface DashboardData {
  period: DashboardPeriod;
  kpis: DashboardKpi[];
  procedureTrend: ChartDatum[];
  consumptionByType: ChartDatum[];
  topProtocols: ChartDatum[];
  routeDistribution: ChartDatum[];
  stockByCategory: ChartDatum[];
  expirationBuckets: ChartDatum[];
  alertsBySeverity: ChartDatum[];
  recentActivity: DashboardActivity[];
  alerts: DashboardAlert[];
}

export interface DashboardSummaryRow {
  active_patients: number;
  inactive_patients: number;
  new_patients: number;
  procedures_total: number;
  procedures_today: number;
  pending_procedures: number;
  active_protocols: number;
  inventory_items: number;
  low_stock_items: number;
  out_stock_items: number;
  expired_batches: number;
  expiring_batches: number;
  labels_generated: number;
  sync_failures: number;
}
