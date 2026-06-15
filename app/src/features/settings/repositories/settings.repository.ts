import { dbExecute, dbSelect } from "@/lib/db/sqlite";

const CLINIC_ID = "ana-morong-clinic";

export interface SettingRow {
  key: string;
  value: string | null;
}

export const settingsRepository = {
  async getAll(): Promise<Record<string, string>> {
    const rows = await dbSelect<SettingRow>(
      `SELECT key, value FROM settings WHERE clinic_id = ?`,
      [CLINIC_ID]
    );
    
    const settings: Record<string, string> = {};
    for (const row of rows) {
      if (row.value !== null) {
        settings[row.key] = row.value;
      }
    }
    return settings;
  },

  async saveMany(settings: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(settings)) {
      const existing = await dbSelect<{ id: string }>(
        `SELECT id FROM settings WHERE clinic_id = ? AND key = ?`,
        [CLINIC_ID, key]
      );

      if (existing.length > 0) {
        await dbExecute(
          `UPDATE settings SET value = ?, updated_at = datetime('now') WHERE clinic_id = ? AND key = ?`,
          [value, CLINIC_ID, key]
        );
      } else {
        const id = crypto.randomUUID();
        await dbExecute(
          `INSERT INTO settings (id, clinic_id, key, value) VALUES (?, ?, ?, ?)`,
          [id, CLINIC_ID, key, value]
        );
      }
    }
  }
};
