import { dbSelect, dbExecute } from "@/lib/db/sqlite";
import type { EvolutionTemplate } from "../types";

class EvolutionTemplatesRepository {
  async listAll(): Promise<EvolutionTemplate[]> {
    const sql = `SELECT * FROM evolution_templates WHERE deleted_at IS NULL ORDER BY name ASC`;
    const rows = await dbSelect<any>(sql);
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      templateText: r.template_text,
      appliesToProtocolId: r.applies_to_protocol_id,
      isDefault: Number(r.is_default),
      isActive: Number(r.is_active)
    }));
  }

  async create(data: Omit<EvolutionTemplate, "id"> & { id: string }): Promise<void> {
    const sql = `
      INSERT INTO evolution_templates (
        id, name, template_text, applies_to_protocol_id, is_default, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
    await dbExecute(sql, [
      data.id,
      data.name,
      data.templateText,
      data.appliesToProtocolId ?? null,
      data.isDefault,
      data.isActive
    ]);
  }

  async update(id: string, data: Partial<EvolutionTemplate>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push(`name = ?`);
      values.push(data.name);
    }
    if (data.templateText !== undefined) {
      fields.push(`template_text = ?`);
      values.push(data.templateText);
    }
    if (data.appliesToProtocolId !== undefined) {
      fields.push(`applies_to_protocol_id = ?`);
      values.push(data.appliesToProtocolId);
    }
    if (data.isDefault !== undefined) {
      fields.push(`is_default = ?`);
      values.push(data.isDefault);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = ?`);
      values.push(data.isActive);
    }

    if (fields.length === 0) return;

    fields.push(`updated_at = datetime('now')`);
    const sql = `UPDATE evolution_templates SET ${fields.join(", ")} WHERE id = ?`;
    values.push(id);

    await dbExecute(sql, values);
  }

  async delete(id: string): Promise<void> {
    const sql = `UPDATE evolution_templates SET deleted_at = datetime('now') WHERE id = ?`;
    await dbExecute(sql, [id]);
  }
}

export const evolutionTemplatesRepository = new EvolutionTemplatesRepository();
