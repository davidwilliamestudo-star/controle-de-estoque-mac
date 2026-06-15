import { dbExecute, dbExecuteRequired } from "@/lib/db/sqlite";
import { CLINIC_ID } from "../types";

export const batchRepository = {
  async create(id: string, data: {
    inventoryItemId: string;
    batchNumber: string;
    expirationDate?: string | null;
    supplierId?: string | null;
    entryDate: string;
    quantity: number;
    unitCost?: number | null;
    invoiceNumber?: string | null;
    notes?: string | null;
  }): Promise<void> {
    await dbExecute(`
      INSERT INTO inventory_batches (
        id, clinic_id, inventory_item_id, batch_number, expiration_date, supplier_id,
        entry_date, initial_quantity, current_quantity, unit_cost, invoice_number, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      CLINIC_ID,
      data.inventoryItemId,
      data.batchNumber,
      data.expirationDate ?? null,
      data.supplierId ?? null,
      data.entryDate,
      data.quantity,
      data.quantity,
      data.unitCost ?? null,
      data.invoiceNumber ?? null,
      data.notes ?? null,
    ]);
  },

  async updateQuantity(id: string, quantityDelta: number): Promise<void> {
    await dbExecuteRequired(`
      UPDATE inventory_batches
      SET current_quantity = current_quantity + ?, updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL
        AND current_quantity + ? >= 0
    `, [quantityDelta, id, CLINIC_ID, quantityDelta]);
  },
};
