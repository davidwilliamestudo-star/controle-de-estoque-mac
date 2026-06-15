import { dbExecute, dbSelect } from "@/lib/db/sqlite";

const CLINIC_ID = "ana-morong-clinic";

export interface ExternalSyncQueueItem {
  id: string;
  clinic_id: string;
  provider: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  request_id: string;
  payload_json: string;
  status: 'pending' | 'processing' | 'synced' | 'failed' | 'cancelled';
  attempts: number;
  last_attempt_at: string | null;
  next_attempt_at: string | null;
  last_error: string | null;
  response_json: string | null;
  created_at: string;
  updated_at: string;
}

export const externalSyncQueueRepository = {
  async enqueue(data: Omit<ExternalSyncQueueItem, "id" | "clinic_id" | "status" | "attempts" | "last_attempt_at" | "last_error" | "response_json" | "created_at" | "updated_at">): Promise<string> {
    const id = crypto.randomUUID();
    await dbExecute(
      `INSERT INTO external_sync_queue 
       (id, clinic_id, provider, action, entity_type, entity_id, request_id, payload_json, status, attempts, next_attempt_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)
       ON CONFLICT(provider, request_id) DO UPDATE SET
         payload_json = CASE
           WHEN external_sync_queue.status IN ('pending','failed','cancelled') THEN excluded.payload_json
           ELSE external_sync_queue.payload_json
         END,
         status = CASE
           WHEN external_sync_queue.status IN ('failed','cancelled') THEN 'pending'
           ELSE external_sync_queue.status
         END,
         attempts = CASE
           WHEN external_sync_queue.status IN ('failed','cancelled') THEN 0
           ELSE external_sync_queue.attempts
         END,
         next_attempt_at = CASE
           WHEN external_sync_queue.status IN ('failed','cancelled') THEN NULL
           ELSE external_sync_queue.next_attempt_at
         END,
         last_error = CASE
           WHEN external_sync_queue.status IN ('failed','cancelled') THEN NULL
           ELSE external_sync_queue.last_error
         END,
         updated_at = datetime('now')`,
      [id, CLINIC_ID, data.provider, data.action, data.entity_type, data.entity_id, data.request_id, data.payload_json, data.next_attempt_at || null]
    );
    return id;
  },

  async cancelPendingForEntity(entityType: string, entityId: string, actions?: string[]): Promise<void> {
    const params: unknown[] = [CLINIC_ID, entityType, entityId];
    const actionFilter = actions && actions.length > 0
      ? ` AND action IN (${actions.map(() => "?").join(",")})`
      : "";
    if (actions) params.push(...actions);

    await dbExecute(
      `
        UPDATE external_sync_queue
        SET status = 'cancelled', updated_at = datetime('now')
        WHERE clinic_id = ?
          AND provider = 'apps_script'
          AND entity_type = ?
          AND entity_id = ?
          AND status IN ('pending','failed')
          ${actionFilter}
      `,
      params
    );
  },

  async getPending(): Promise<ExternalSyncQueueItem[]> {
    return dbSelect<ExternalSyncQueueItem>(
      `SELECT * FROM external_sync_queue 
       WHERE clinic_id = ? 
         AND status IN ('pending', 'failed')
         AND (next_attempt_at IS NULL OR datetime(next_attempt_at) <= datetime('now'))
         AND attempts < 5
       ORDER BY created_at ASC`,
      [CLINIC_ID]
    );
  },

  async getAllLogs(): Promise<ExternalSyncQueueItem[]> {
    return dbSelect<ExternalSyncQueueItem>(
      `SELECT * FROM external_sync_queue WHERE clinic_id = ? ORDER BY created_at DESC LIMIT 100`,
      [CLINIC_ID]
    );
  },

  async markProcessing(id: string): Promise<void> {
    await dbExecute(
      `UPDATE external_sync_queue SET status = 'processing', last_attempt_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [id]
    );
  },

  async markSynced(id: string, responseJson: string): Promise<void> {
    await dbExecute(
      `UPDATE external_sync_queue 
       SET status = 'synced', response_json = ?, updated_at = datetime('now') 
       WHERE id = ?`,
      [responseJson, id]
    );
  },

  async markFailed(id: string, error: string, nextAttemptAt: string | null, attempts: number): Promise<void> {
    await dbExecute(
      `UPDATE external_sync_queue 
       SET status = 'failed', last_error = ?, last_attempt_at = datetime('now'), next_attempt_at = ?, attempts = ?, updated_at = datetime('now') 
       WHERE id = ?`,
      [error, nextAttemptAt, attempts, id]
    );
  },

  async cancel(id: string): Promise<void> {
    await dbExecute(
      `UPDATE external_sync_queue SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`,
      [id]
    );
  },

  async forceRetry(id: string): Promise<void> {
    await dbExecute(
      `UPDATE external_sync_queue SET status = 'pending', next_attempt_at = NULL, attempts = 0, updated_at = datetime('now') WHERE id = ?`,
      [id]
    );
  }
};
