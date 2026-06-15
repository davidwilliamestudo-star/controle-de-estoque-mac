import { dbExecute, dbSelect } from "@/lib/db/sqlite";

const CLINIC_ID = "ana-morong-clinic";

export interface ExternalSyncLog {
  id: string;
  clinic_id: string;
  provider: string;
  action: string;
  request_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  status: string;
  response_json: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export const externalSyncLogsRepository = {
  async log(data: Omit<ExternalSyncLog, "id" | "clinic_id" | "created_at" | "updated_at">): Promise<string> {
    const id = crypto.randomUUID();
    await dbExecute(
      `INSERT INTO external_sync_logs 
       (id, clinic_id, provider, action, request_id, entity_type, entity_id, status, response_json, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, CLINIC_ID, data.provider, data.action, data.request_id, data.entity_type, data.entity_id, data.status, data.response_json, data.error_message]
    );
    return id;
  },

  async getLogs(limit: number = 50): Promise<ExternalSyncLog[]> {
    return dbSelect<ExternalSyncLog>(
      `SELECT * FROM external_sync_logs WHERE clinic_id = ? ORDER BY created_at DESC LIMIT ?`,
      [CLINIC_ID, limit]
    );
  }
};
