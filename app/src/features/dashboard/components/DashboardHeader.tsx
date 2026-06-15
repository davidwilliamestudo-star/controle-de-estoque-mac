import { RefreshCw } from "lucide-react";
import type { DashboardPeriodPreset } from "../types/dashboard.types";
import { DashboardPeriodFilter } from "./DashboardPeriodFilter";

interface DashboardHeaderProps {
  preset: DashboardPeriodPreset;
  startDate: string;
  endDate: string;
  isRefreshing: boolean;
  onPresetChange: (preset: DashboardPeriodPreset) => void;
  onCustomDateChange: (field: "startDate" | "endDate", value: string) => void;
  onRefresh: () => void;
}

export function DashboardHeader(props: DashboardHeaderProps) {
  return (
    <div className="page-header dashboard-header">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Visao operacional real do estoque, pacientes, aplicacoes e alertas.</p>
      </div>

      <div className="dashboard-header-actions">
        <DashboardPeriodFilter
          value={props.preset}
          startDate={props.startDate}
          endDate={props.endDate}
          onPresetChange={props.onPresetChange}
          onCustomDateChange={props.onCustomDateChange}
        />
        <button type="button" className="btn btn-secondary" onClick={props.onRefresh} disabled={props.isRefreshing}>
          <RefreshCw size={16} className={props.isRefreshing ? "spin-icon" : undefined} />
          Atualizar
        </button>
      </div>
    </div>
  );
}
