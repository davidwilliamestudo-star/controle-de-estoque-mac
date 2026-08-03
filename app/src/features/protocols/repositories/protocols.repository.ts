import { dbSelect, dbExecute } from "@/lib/db/sqlite";
import type { Protocol, ProtocolItem, EvolutionTemplate } from "../types";

class ProtocolsRepository {
  async listAll(): Promise<Protocol[]> {
    const sql = `
      SELECT p.*,
             c.name as categoryName,
             r.name as routeName
      FROM protocols p
      LEFT JOIN inventory_categories c ON p.category_id = c.id
      LEFT JOIN administration_routes r ON p.administration_route_id = r.id
      WHERE p.deleted_at IS NULL
      ORDER BY p.name ASC
    `;
    const rows = await dbSelect<any>(sql);
    return rows.map(r => this.mapProtocol(r));
  }

  async findById(id: string): Promise<Protocol | null> {
    const sql = `
      SELECT p.*,
             c.name as categoryName,
             r.name as routeName
      FROM protocols p
      LEFT JOIN inventory_categories c ON p.category_id = c.id
      LEFT JOIN administration_routes r ON p.administration_route_id = r.id
      WHERE p.id = ? AND p.deleted_at IS NULL
    `;
    const rows = await dbSelect<any>(sql, [id]);
    return rows.length > 0 ? this.mapProtocol(rows[0]) : null;
  }

  async create(data: Partial<Protocol>): Promise<void> {
    const id = data.id || crypto.randomUUID();
    const sql = `
      INSERT INTO protocols (
        id, name, category_id, administration_route_id, description, internal_notes, default_evolution_template_id, is_active, base_price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await dbExecute(sql, [
      id,
      data.name,
      data.categoryId ?? null,
      data.administrationRouteId ?? null,
      data.description ?? null,
      data.internalNotes ?? null,
      data.defaultEvolutionTemplateId ?? null,
      data.isActive !== undefined ? data.isActive : 1,
      data.basePrice ?? 0
    ]);
  }

  async update(id: string, data: Partial<Protocol>): Promise<void> {
    const sql = `
      UPDATE protocols SET
        name = ?,
        category_id = ?,
        administration_route_id = ?,
        description = ?,
        internal_notes = ?,
        default_evolution_template_id = ?,
        is_active = ?,
        base_price = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `;
    await dbExecute(sql, [
      data.name,
      data.categoryId ?? null,
      data.administrationRouteId ?? null,
      data.description ?? null,
      data.internalNotes ?? null,
      data.defaultEvolutionTemplateId ?? null,
      data.isActive !== undefined ? data.isActive : 1,
      data.basePrice ?? 0,
      id
    ]);
  }

  async delete(id: string): Promise<void> {
    const sql = `UPDATE protocols SET deleted_at = datetime('now') WHERE id = ?`;
    await dbExecute(sql, [id]);
  }

  // Protocol Items
  async listItems(protocolId: string): Promise<ProtocolItem[]> {
    const sql = `
      SELECT pi.*, i.name as itemName
      FROM protocol_items pi
      JOIN inventory_items i ON pi.inventory_item_id = i.id
      WHERE pi.protocol_id = ? AND pi.deleted_at IS NULL
    `;
    const rows = await dbSelect<any>(sql, [protocolId]);
    return rows.map(r => ({
      id: r.id,
      protocolId: r.protocol_id,
      inventoryItemId: r.inventory_item_id,
      itemRole: r.item_role,
      defaultQuantity: Number(r.default_quantity),
      unit: r.unit,
      isRequired: Number(r.is_required),
      notes: r.notes,
      itemName: r.itemName
    }));
  }

  async createItem(data: Partial<ProtocolItem>): Promise<void> {
    const id = data.id || crypto.randomUUID();
    const sql = `
      INSERT INTO protocol_items (
        id, protocol_id, inventory_item_id, item_role, default_quantity, unit, is_required, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await dbExecute(sql, [
      id,
      data.protocolId,
      data.inventoryItemId,
      data.itemRole,
      data.defaultQuantity || 1,
      data.unit || 'un',
      data.isRequired !== undefined ? data.isRequired : 1,
      data.notes ?? null
    ]);
  }

  async deleteItem(id: string): Promise<void> {
    const sql = `UPDATE protocol_items SET deleted_at = datetime('now') WHERE id = ?`;
    await dbExecute(sql, [id]);
  }
  
  // Evolution Templates
  async listTemplates(): Promise<EvolutionTemplate[]> {
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

  private mapProtocol(r: any): Protocol {
    return {
      id: r.id,
      name: r.name,
      categoryId: r.category_id,
      administrationRouteId: r.administration_route_id,
      description: r.description,
      internalNotes: r.internal_notes,
      defaultEvolutionTemplateId: r.default_evolution_template_id,
      isActive: Number(r.is_active),
      basePrice: Number(r.base_price || 0),
      categoryName: r.categoryName,
      routeName: r.routeName
    };
  }
}

export const protocolsRepository = new ProtocolsRepository();
