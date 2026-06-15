import { dbExecute, dbSelect } from "@/lib/db/sqlite";
import type { AppNotification, NotificationDraft } from "../types/notification.types";

const CLINIC_ID = "ana-morong-clinic";

interface NotificationCountRow {
  total: number;
}

interface StockNotificationRow {
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
  unit: string;
}

interface BatchNotificationRow {
  id: string;
  item_name: string;
  batch_number: string;
  expiration_date: string;
  current_quantity: number;
}

interface AppointmentSyncFailureRow {
  id: string;
  sync_status: string;
  sync_error?: string | null;
}

export const notificationsRepository = {
  async list(limit = 20): Promise<AppNotification[]> {
    return dbSelect<AppNotification>(`
      SELECT *
      FROM notifications
      WHERE clinic_id = ? AND deleted_at IS NULL AND status IN ('unread','read')
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        created_at DESC
      LIMIT ?
    `, [CLINIC_ID, limit]);
  },

  async countUnread(): Promise<number> {
    const rows = await dbSelect<NotificationCountRow>(`
      SELECT COUNT(*) AS total
      FROM notifications
      WHERE clinic_id = ? AND deleted_at IS NULL AND status = 'unread'
    `, [CLINIC_ID]);
    return Number(rows[0]?.total ?? 0);
  },

  async upsertActiveNotification(draft: NotificationDraft, userId?: string | null): Promise<void> {
    const existing = await dbSelect<{ id: string }>(`
      SELECT id
      FROM notifications
      WHERE clinic_id = ?
        AND type = ?
        AND COALESCE(entity_type, '') = COALESCE(?, '')
        AND COALESCE(entity_id, '') = COALESCE(?, '')
        AND deleted_at IS NULL
        AND status IN ('unread','read')
      LIMIT 1
    `, [CLINIC_ID, draft.type, draft.entityType ?? null, draft.entityId ?? null]);

    const metadata = draft.metadata ? JSON.stringify(draft.metadata) : null;

    if (existing[0]) {
      await dbExecute(`
        UPDATE notifications
        SET title = ?,
            message = ?,
            severity = ?,
            action_url = ?,
            metadata_json = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `, [
        draft.title,
        draft.message,
        draft.severity,
        draft.actionUrl ?? null,
        metadata,
        existing[0].id,
      ]);
      return;
    }

    await dbExecute(`
      INSERT INTO notifications (
        id, clinic_id, user_id, type, title, message, entity_type, entity_id,
        severity, status, action_url, metadata_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unread', ?, ?)
    `, [
      crypto.randomUUID(),
      CLINIC_ID,
      userId ?? null,
      draft.type,
      draft.title,
      draft.message,
      draft.entityType ?? null,
      draft.entityId ?? null,
      draft.severity,
      draft.actionUrl ?? null,
      metadata,
    ]);
  },

  async markRead(id: string): Promise<void> {
    await dbExecute(`
      UPDATE notifications
      SET status = 'read', read_at = COALESCE(read_at, datetime('now')), updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ? AND status = 'unread'
    `, [id, CLINIC_ID]);
  },

  async markAllRead(): Promise<void> {
    await dbExecute(`
      UPDATE notifications
      SET status = 'read', read_at = COALESCE(read_at, datetime('now')), updated_at = datetime('now')
      WHERE clinic_id = ? AND status = 'unread' AND deleted_at IS NULL
    `, [CLINIC_ID]);
  },

  async resolve(id: string): Promise<void> {
    await dbExecute(`
      UPDATE notifications
      SET status = 'resolved', updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ?
    `, [id, CLINIC_ID]);
  },

  async listLowStockItems(): Promise<StockNotificationRow[]> {
    return dbSelect<StockNotificationRow>(`
      SELECT id, name, current_stock, minimum_stock, unit
      FROM inventory_items
      WHERE clinic_id = ?
        AND deleted_at IS NULL
        AND is_active = 1
        AND minimum_stock > 0
        AND current_stock > 0
        AND current_stock <= minimum_stock
      ORDER BY current_stock ASC, name ASC
      LIMIT 50
    `, [CLINIC_ID]);
  },

  async listOutOfStockItems(): Promise<StockNotificationRow[]> {
    return dbSelect<StockNotificationRow>(`
      SELECT id, name, current_stock, minimum_stock, unit
      FROM inventory_items
      WHERE clinic_id = ?
        AND deleted_at IS NULL
        AND is_active = 1
        AND current_stock <= 0
      ORDER BY name ASC
      LIMIT 50
    `, [CLINIC_ID]);
  },

  async listExpiredBatches(): Promise<BatchNotificationRow[]> {
    return dbSelect<BatchNotificationRow>(`
      SELECT b.id, i.name AS item_name, b.batch_number, b.expiration_date, b.current_quantity
      FROM inventory_batches b
      JOIN inventory_items i ON i.id = b.inventory_item_id
      WHERE b.clinic_id = ?
        AND b.deleted_at IS NULL
        AND b.current_quantity > 0
        AND b.expiration_date IS NOT NULL
        AND date(b.expiration_date) < date('now')
      ORDER BY b.expiration_date ASC
      LIMIT 50
    `, [CLINIC_ID]);
  },

  async listExpiringBatches(days = 30): Promise<BatchNotificationRow[]> {
    return dbSelect<BatchNotificationRow>(`
      SELECT b.id, i.name AS item_name, b.batch_number, b.expiration_date, b.current_quantity
      FROM inventory_batches b
      JOIN inventory_items i ON i.id = b.inventory_item_id
      WHERE b.clinic_id = ?
        AND b.deleted_at IS NULL
        AND b.current_quantity > 0
        AND b.expiration_date IS NOT NULL
        AND date(b.expiration_date) BETWEEN date('now') AND date('now', '+' || ? || ' days')
      ORDER BY b.expiration_date ASC
      LIMIT 50
    `, [CLINIC_ID, days]);
  },

  async listAppointmentSyncFailures(): Promise<AppointmentSyncFailureRow[]> {
    return dbSelect<AppointmentSyncFailureRow>(`
      SELECT id, sync_status, sync_error
      FROM appointments
      WHERE clinic_id = ?
        AND deleted_at IS NULL
        AND sync_status = 'failed'
      ORDER BY updated_at DESC
      LIMIT 20
    `, [CLINIC_ID]);
  },
};
