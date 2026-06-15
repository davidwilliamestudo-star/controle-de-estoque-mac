import { dbExecute, dbSelect } from "@/lib/db/sqlite";
import { CLINIC_ID, type Supplier } from "../types";

export const suppliersRepository = {
  async list(): Promise<Supplier[]> {
    return dbSelect<Supplier>(`
      SELECT id, name, phone, email, document, contact_name, address, notes
      FROM suppliers
      WHERE clinic_id = ? AND deleted_at IS NULL AND is_active = 1
      ORDER BY name ASC
    `, [CLINIC_ID]);
  },

  async findByName(name: string): Promise<Supplier | null> {
    const rows = await dbSelect<Supplier>(`
      SELECT id, name
      FROM suppliers
      WHERE clinic_id = ? AND deleted_at IS NULL AND lower(name) = lower(?)
      LIMIT 1
    `, [CLINIC_ID, name.trim()]);
    return rows[0] ?? null;
  },

  async create(id: string, name: string): Promise<void> {
    await dbExecute(`
      INSERT INTO suppliers (id, clinic_id, name, is_active)
      VALUES (?, ?, ?, 1)
    `, [id, CLINIC_ID, name.trim()]);
  },

  async createFull(id: string, data: {
    name: string;
    phone?: string | null;
    email?: string | null;
    document?: string | null;
    contact_name?: string | null;
    address?: string | null;
    notes?: string | null;
  }): Promise<void> {
    await dbExecute(`
      INSERT INTO suppliers (id, clinic_id, name, phone, email, document, contact_name, address, notes, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      id,
      CLINIC_ID,
      data.name.trim(),
      data.phone ?? null,
      data.email ?? null,
      data.document ?? null,
      data.contact_name ?? null,
      data.address ?? null,
      data.notes ?? null,
    ]);
  },

  async update(id: string, data: {
    name?: string;
    phone?: string | null;
    email?: string | null;
    document?: string | null;
    contact_name?: string | null;
    address?: string | null;
    notes?: string | null;
  }): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name.trim()); }
    if (data.phone !== undefined) { fields.push("phone = ?"); values.push(data.phone); }
    if (data.email !== undefined) { fields.push("email = ?"); values.push(data.email); }
    if (data.document !== undefined) { fields.push("document = ?"); values.push(data.document); }
    if (data.contact_name !== undefined) { fields.push("contact_name = ?"); values.push(data.contact_name); }
    if (data.address !== undefined) { fields.push("address = ?"); values.push(data.address); }
    if (data.notes !== undefined) { fields.push("notes = ?"); values.push(data.notes); }

    if (fields.length === 0) return;

    fields.push("updated_at = datetime('now')");
    values.push(id, CLINIC_ID);

    await dbExecute(`
      UPDATE suppliers
      SET ${fields.join(", ")}
      WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL
    `, values);
  },

  async softDelete(id: string): Promise<void> {
    await dbExecute(`
      UPDATE suppliers
      SET deleted_at = datetime('now'), is_active = 0, updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL
    `, [id, CLINIC_ID]);
  },

  async isSupplierInUse(id: string): Promise<boolean> {
    const rows = await dbSelect<{ count: number }>(`
      SELECT COUNT(id) as count
      FROM inventory_items
      WHERE supplier_id = ? AND clinic_id = ? AND deleted_at IS NULL
    `, [id, CLINIC_ID]);
    
    if ((rows[0]?.count ?? 0) > 0) return true;

    const batchesRows = await dbSelect<{ count: number }>(`
      SELECT COUNT(id) as count
      FROM inventory_batches
      WHERE supplier_id = ? AND clinic_id = ? AND deleted_at IS NULL
    `, [id, CLINIC_ID]);

    return (batchesRows[0]?.count ?? 0) > 0;
  },

  async getPurchaseHistory(id: string): Promise<any[]> {
    return dbSelect(`
      SELECT 
        iri.id,
        ir.entry_date,
        i.name as item_name,
        iri.commercial_quantity as quantity,
        iri.commercial_unit as unit,
        iri.unit_cost,
        iri.total_cost,
        ir.invoice_number
      FROM inventory_receipt_items iri
      JOIN inventory_receipts ir ON ir.id = iri.receipt_id
      JOIN inventory_items i ON i.id = iri.inventory_item_id
      WHERE iri.supplier_id = ? AND iri.clinic_id = ? AND iri.deleted_at IS NULL
      ORDER BY ir.entry_date DESC
      LIMIT 100
    `, [id, CLINIC_ID]);
  },

  async getSuppliedItems(id: string): Promise<any[]> {
    return dbSelect(`
      SELECT 
        i.id,
        i.name,
        i.item_type,
        i.unit,
        MAX(ir.entry_date) as last_purchase_date,
        (
          SELECT iri2.unit_cost 
          FROM inventory_receipt_items iri2
          JOIN inventory_receipts ir2 ON ir2.id = iri2.receipt_id
          WHERE iri2.inventory_item_id = i.id AND iri2.supplier_id = ? AND iri2.deleted_at IS NULL
          ORDER BY ir2.entry_date DESC LIMIT 1
        ) as last_unit_cost
      FROM inventory_items i
      JOIN inventory_receipt_items iri ON iri.inventory_item_id = i.id
      JOIN inventory_receipts ir ON ir.id = iri.receipt_id
      WHERE iri.supplier_id = ? AND i.clinic_id = ? AND i.deleted_at IS NULL
      GROUP BY i.id
      ORDER BY i.name ASC
    `, [id, id, CLINIC_ID]);
  },
};
