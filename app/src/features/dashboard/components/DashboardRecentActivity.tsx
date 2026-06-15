import { Clock3, FileClock } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DashboardActivity } from "../types/dashboard.types";
import { DashboardEmptyState } from "./DashboardEmptyState";

interface DashboardRecentActivityProps {
  activities: DashboardActivity[];
}

function relativeDate(value: string) {
  try {
    return formatDistanceToNowStrict(new Date(value), { addSuffix: true, locale: ptBR });
  } catch {
    return value;
  }
}

export function DashboardRecentActivity({ activities }: DashboardRecentActivityProps) {
  return (
    <div className="card dashboard-panel">
      <div className="card-header">
        <div>
          <h3 className="card-title">Atividade recente</h3>
          <p className="card-description">Ultimos eventos registrados na auditoria local.</p>
        </div>
      </div>

      {activities.length === 0 ? (
        <DashboardEmptyState
          icon={<FileClock />}
          title="Sem atividade registrada"
          description="A auditoria aparecera aqui conforme o sistema for usado."
        />
      ) : (
        <div className="timeline dashboard-activity-timeline">
          {activities.map(activity => (
            <div key={activity.id} className="timeline-item">
              <span className="timeline-dot" />
              <div className="timeline-content">
                <div className="dashboard-activity-title">
                  <strong>{activity.action}</strong>
                  <span><Clock3 size={13} /> {relativeDate(activity.createdAt)}</span>
                </div>
                <p>{activity.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
