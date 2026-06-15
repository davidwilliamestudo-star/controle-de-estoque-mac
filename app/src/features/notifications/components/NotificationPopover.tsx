import { CheckCheck, Inbox } from "lucide-react";
import type { AppNotification } from "../types/notification.types";
import { NotificationItem } from "./NotificationItem";

interface NotificationPopoverProps {
  notifications: AppNotification[];
  isLoading: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export function NotificationPopover({ notifications, isLoading, onMarkRead, onMarkAllRead }: NotificationPopoverProps) {
  const unreadCount = notifications.filter(item => item.status === "unread").length;

  return (
    <div className="notification-popover">
      <div className="notification-popover-header">
        <div>
          <strong>Notificacoes</strong>
          <span>{unreadCount} nao lida{unreadCount === 1 ? "" : "s"}</span>
        </div>
        <button type="button" className="btn btn-ghost btn-icon" title="Marcar todas como lidas" onClick={onMarkAllRead} disabled={unreadCount === 0}>
          <CheckCheck size={16} />
        </button>
      </div>

      <div className="notification-popover-list">
        {isLoading ? (
          <div className="notification-empty">Carregando...</div>
        ) : notifications.length === 0 ? (
          <div className="notification-empty">
            <Inbox size={22} />
            <span>Nenhuma notificacao aberta.</span>
          </div>
        ) : (
          notifications.map(notification => (
            <NotificationItem key={notification.id} notification={notification} onMarkRead={onMarkRead} />
          ))
        )}
      </div>
    </div>
  );
}
