import { dbExecute, dbSelect } from "@/lib/db/sqlite";
import type { AuthUser } from "../types";

interface AuthUserRow extends AuthUser {
  password_hash: string;
}

export const authRepository = {
  async findActiveUserByEmail(email: string): Promise<AuthUserRow | null> {
    const rows = await dbSelect<AuthUserRow>(`
      SELECT id, clinic_id, name, email, password_hash, role, is_active, last_login_at
      FROM users
      WHERE lower(email) = lower(?)
        AND deleted_at IS NULL
      LIMIT 1
    `, [email.trim()]);

    return rows[0] ?? null;
  },

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await dbExecute(`
      UPDATE users
      SET password_hash = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [passwordHash, userId]);
  },

  async touchLastLogin(userId: string): Promise<void> {
    await dbExecute(`
      UPDATE users
      SET last_login_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `, [userId]);
  },
};

