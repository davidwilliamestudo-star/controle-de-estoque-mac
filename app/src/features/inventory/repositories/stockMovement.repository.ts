import { dbExecute } from "@/lib/db/sqlite";
import { CLINIC_ID } from "../types";

export const stockMovementRepository = {
  async createEntry(id: string, data: {
    inventoryItemId: string;
    inventoryBatchId?: string | null;
    quantity: number;
    unit: string;
    reason: string;
    userId?: string | null;
    notes?: string | null;
    locationId?: string | null;
  }): Promise<void> {
    await dbExecute(`
      INSERT INTO stock_movements (
        id, clinic_id, inventory_item_id, inventory_batch_id, movement_type,
        quantity, unit, reason, user_id, notes, location_id
      )
      VALUES (?, ?, ?, ?, 'entry', ?, ?, ?, ?, ?, ?)
    `, [
      id,
      CLINIC_ID,
      data.inventoryItemId,
      data.inventoryBatchId ?? null,
      data.quantity,
      data.unit,
      data.reason,
      data.userId ?? null,
      data.notes ?? null,
      data.locationId ?? null,
    ]);
  },

  async createExit(id: string, data: {
    inventoryItemId: string;
    inventoryBatchId?: string | null;
    quantity: number;
    unit: string;
    reason: string;
    userId?: string | null;
    patientId?: string | null;
    protocolId?: string | null;
    procedureId?: string | null;
    notes?: string | null;
    locationId?: string | null;
  }): Promise<void> {
    await dbExecute(`
      INSERT INTO stock_movements (
        id, clinic_id, inventory_item_id, inventory_batch_id, movement_type,
        quantity, unit, reason, user_id, patient_id, protocol_id, procedure_id, notes, location_id
      )
      VALUES (?, ?, ?, ?, 'automatic_exit', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      CLINIC_ID,
      data.inventoryItemId,
      data.inventoryBatchId ?? null,
      data.quantity,
      data.unit,
      data.reason,
      data.userId ?? null,
      data.patientId ?? null,
      data.protocolId ?? null,
      data.procedureId ?? null,
      data.notes ?? null,
      data.locationId ?? null,
    ]);
  },

  async createAdjustment(id: string, data: {
    inventoryItemId: string;
    quantity: number;
    unit: string;
    reason: string;
    userId?: string | null;
    notes?: string | null;
    locationId?: string | null;
  }): Promise<void> {
    await dbExecute(`
      INSERT INTO stock_movements (
        id, clinic_id, inventory_item_id, inventory_batch_id, movement_type,
        quantity, unit, reason, user_id, notes, location_id
      )
      VALUES (?, ?, ?, NULL, 'adjustment', ?, ?, ?, ?, ?, ?)
    `, [
      id,
      CLINIC_ID,
      data.inventoryItemId,
      data.quantity,
      data.unit,
      data.reason,
      data.userId ?? null,
      data.notes ?? null,
      data.locationId ?? null,
    ]);
  },
};
