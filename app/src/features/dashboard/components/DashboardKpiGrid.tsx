import { Activity, AlertTriangle, Boxes, CalendarCheck, ClipboardList, PackageCheck, Tags, Users } from "lucide-react";
import type { DashboardKpi } from "../types/dashboard.types";

const icons = {
  procedures: Activity,
  patients: Users,
  stock: Boxes,
  batches: PackageCheck,
  protocols: ClipboardList,
  labels: Tags,
  sync: CalendarCheck,
  alerts: AlertTriangle,
};

interface DashboardKpiGridProps {
  kpis: DashboardKpi[];
}

export function DashboardKpiGrid({ kpis }: DashboardKpiGridProps) {
  return (
    <div className="dashboard-kpi-grid">
      {kpis.map(kpi => {
        const Icon = icons[kpi.id as keyof typeof icons] ?? Activity;
        return (
          <div key={kpi.id} className={`card dashboard-kpi-card tone-${kpi.tone}`}>
            <div className="summary-card-header">
              <span>{kpi.label}</span>
              <Icon size={20} />
            </div>
            <div className="summary-card-value">{kpi.value}</div>
            <div className="summary-card-subtext">{kpi.helper}</div>
          </div>
        );
      })}
    </div>
  );
}
