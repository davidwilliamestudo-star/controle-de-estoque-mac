import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface DashboardEmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export function DashboardEmptyState({ title, description, icon }: DashboardEmptyStateProps) {
  return (
    <div className="dashboard-empty-state">
      <div className="empty-state-icon">{icon ?? <Inbox />}</div>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-description">{description}</div>
    </div>
  );
}
