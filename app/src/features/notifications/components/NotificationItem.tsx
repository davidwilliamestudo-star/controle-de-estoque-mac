import { Check, CircleAlert } from "lucide-react";
import type { AppNotification } from "../types/notification.types";

interface NotificationItemProps {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
}

function severityClass(severity: AppNotification["severity"]) {
  if (severity === "critical" || severity === "high") return "badge-danger";
  if (severity === "medium") return "badge-warning";
  if (severity === "info") return "badge-success";
  return "badge-neutral";
}

function severityLabel(severity: AppNotification["severity"]) {
  const labels = {
    critical: "Critico",
    high: "Alto",
    medium: "Medio",
    low: "Baixo",
    info: "Info",
  };
  return labels[severity];
}

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  return (
    <div className={`notification-item ${notification.status === "unread" ? "unread" : ""}`}>
      <div className="notification-item-icon">
        <CircleAlert size={16} />
      </div>
      <div className="notification-item-body">
        <div className="notification-item-title-row">
          <strong>{notification.title}</strong>
          <span className={`badge ${severityClass(notification.severity)}`}>{severityLabel(notification.severity)}</span>
        </div>
        <p>{notification.message}</p>
      </div>
      {notification.status === "unread" && (
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          title="Marcar como lida"
          onClick={() => onMarkRead(notification.id)}
        >
          <Check size={15} />
        </button>
      )}
    </div>
  );
}
