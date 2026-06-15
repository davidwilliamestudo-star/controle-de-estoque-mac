/**
 * audit.repository.ts
 * Persiste logs de auditoria no banco SQLite.
 */
import { dbExecute, dbSelect } from "@/lib/db/sqlite";
import { getStoredAuthSession } from "@/features/auth/session";

const CLINIC_ID = "ana-morong-clinic";

export interface AuditLogEntry {
  action: string;
  entity_type?: string;
  entity_id?: string;
  description?: string;
  before_data?: unknown;
  after_data?: unknown;
  user_id?: string | null;
}

export interface AuditLogItem {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  before_data: string | null;
  after_data: string | null;
  created_at: string;
}

export interface AuditLogFilters {
  search?: string;
  entity_type?: string;
}

export const auditRepository = {
  async log(entry: AuditLogEntry): Promise<void> {
    const id = crypto.randomUUID();
    const session = getStoredAuthSession();
    const userId = "user_id" in entry ? entry.user_id : session?.userId ?? null;
    await dbExecute(`
      INSERT INTO audit_logs (id, clinic_id, user_id, action, entity_type, entity_id, description, before_data, after_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      CLINIC_ID,
      userId,
      entry.action,
      entry.entity_type ?? null,
      entry.entity_id ?? null,
      entry.description ?? null,
      entry.before_data ? JSON.stringify(entry.before_data) : null,
      entry.after_data ? JSON.stringify(entry.after_data) : null,
    ]);
  },

  async findAll(filters?: AuditLogFilters): Promise<AuditLogItem[]> {
    let sql = `
      SELECT 
        a.id, a.user_id, a.action, a.entity_type, a.entity_id, 
        a.description, a.before_data, a.after_data, a.created_at,
        u.name as user_name
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.clinic_id = ?
    `;
    const params: unknown[] = [CLINIC_ID];

    if (filters?.entity_type) {
      sql += ` AND a.entity_type = ?`;
      params.push(filters.entity_type);
    }

    if (filters?.search) {
      sql += ` AND (a.description LIKE ? OR a.action LIKE ? OR u.name LIKE ?)`;
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    sql += ` ORDER BY a.created_at DESC`;

    return dbSelect<AuditLogItem>(sql, params);
  }
};
