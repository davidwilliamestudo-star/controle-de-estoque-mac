import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { DashboardAlert } from "../types/dashboard.types";
import { DashboardEmptyState } from "./DashboardEmptyState";

interface DashboardAlertsPanelProps {
  alerts: DashboardAlert[];
}

function severityClass(severity: DashboardAlert["severity"]) {
  if (severity === "critical" || severity === "high") return "badge-danger";
  if (severity === "medium") return "badge-warning";
  if (severity === "low") return "badge-neutral";
  return "badge-success";
}

function severityLabel(severity: DashboardAlert["severity"]) {
  const labels = {
    critical: "Critico",
    high: "Alto",
    medium: "Medio",
    low: "Baixo",
    info: "Info",
  };
  return labels[severity];
}

export function DashboardAlertsPanel({ alerts }: DashboardAlertsPanelProps) {
  return (
    <div className="card dashboard-panel">
      <div className="card-header">
        <div>
          <h3 className="card-title">Alertas operacionais</h3>
          <p className="card-description">Estoque, lotes, sincronizacao e pendencias reais.</p>
        </div>
      </div>

      {alerts.length === 0 ? (
        <DashboardEmptyState
          icon={<CheckCircle2 />}
          title="Nenhum alerta aberto"
          description="O sistema nao encontrou pendencias criticas nas fontes conectadas."
        />
      ) : (
        <div className="dashboard-alert-list">
          {alerts.map(alert => (
            <div key={alert.id} className={`dashboard-alert-item severity-${alert.severity}`}>
              <div className="dashboard-alert-icon"><AlertCircle size={18} /></div>
              <div>
                <div className="dashboard-alert-title-row">
                  <strong>{alert.title}</strong>
                  <span className={`badge ${severityClass(alert.severity)}`}>{severityLabel(alert.severity)}</span>
                </div>
                <p>{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
