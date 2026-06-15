import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { notificationsService } from "../services/notifications.service";
import { NotificationPopover } from "./NotificationPopover";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      await notificationsService.generateOperationalNotifications();
      return notificationsService.list(25);
    },
    refetchInterval: 60_000,
  });

  const unreadQuery = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: notificationsService.countUnread,
    refetchInterval: 60_000,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  const markReadMutation = useMutation({
    mutationFn: notificationsService.markRead,
    onSuccess: invalidate,
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: invalidate,
  });

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, []);

  const unreadCount = unreadQuery.data ?? 0;

  return (
    <div className="notification-wrapper" ref={wrapperRef}>
      <button className="notification-btn" title="Notificacoes" type="button" onClick={() => setOpen(value => !value)}>
        <Bell size={20} />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <NotificationPopover
          notifications={notificationsQuery.data ?? []}
          isLoading={notificationsQuery.isLoading}
          onMarkRead={id => markReadMutation.mutate(id)}
          onMarkAllRead={() => markAllReadMutation.mutate()}
        />
      )}
    </div>
  );
}
