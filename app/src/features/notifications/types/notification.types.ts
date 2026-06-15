export type NotificationSeverity = "critical" | "high" | "medium" | "low" | "info";
export type NotificationStatus = "unread" | "read" | "resolved" | "dismissed";

export interface AppNotification {
  id: string;
  clinic_id: string;
  user_id?: string | null;
  type: string;
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: string | null;
  severity: NotificationSeverity;
  status: NotificationStatus;
  action_url?: string | null;
  metadata_json?: string | null;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface NotificationDraft {
  type: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  severity: NotificationSeverity;
  actionUrl?: string | null;
  metadata?: unknown;
}
