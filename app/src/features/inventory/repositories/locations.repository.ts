import { dbSelect, dbExecute, dbExecuteRequired } from "@/lib/db/sqlite";
import type { InventoryLocation, InventoryLocationStock, InventoryTransfer } from "../types";

export const locationsRepository = {
  async getDefaultLocationId(): Promise<string> {
    const res = await dbSelect<{ id: string }>(`
      SELECT id FROM inventory_locations
      ORDER BY is_default DESC, name ASC
      LIMIT 1
    `);
    return res[0]?.id ?? "default-location";
  },

  async listLocations(): Promise<InventoryLocation[]> {
    const res = await dbSelect(`SELECT * FROM inventory_locations ORDER BY is_default DESC, name ASC`);
    return res as unknown as InventoryLocation[];
  },

  async getLocation(id: string): Promise<InventoryLocation | null> {
    const res = await dbSelect(`SELECT * FROM inventory_locations WHERE id = $1`, [id]);
    return (res[0] as unknown as InventoryLocation) || null;
  },

  async createLocation(id: string, name: string, description?: string, isDefault: number = 0): Promise<void> {
    await dbExecute(
      `INSERT INTO inventory_locations (id, name, description, is_default) VALUES ($1, $2, $3, $4)`,
      [id, name, description || null, isDefault]
    );
  },

  async updateLocation(id: string, name: string, description?: string): Promise<void> {
    await dbExecute(
      `UPDATE inventory_locations SET name = $1, description = $2, updated_at = datetime('now') WHERE id = $3`,
      [name, description || null, id]
    );
  },

  async deleteLocation(id: string): Promise<void> {
    await dbExecute(`DELETE FROM inventory_locations WHERE id = $1 AND is_default = 0`, [id]);
  },

  async getStockByLocation(inventoryItemId: string): Promise<InventoryLocationStock[]> {
    const query = `
      SELECT 
        ls.id,
        ls.location_id,
        l.name as location_name,
        ls.inventory_item_id,
        ls.inventory_batch_id,
        b.batch_number,
        ls.quantity
      FROM inventory_location_stocks ls
      JOIN inventory_locations l ON l.id = ls.location_id
      LEFT JOIN inventory_batches b ON b.id = ls.inventory_batch_id
      WHERE ls.inventory_item_id = $1 AND ls.quantity > 0
      ORDER BY l.is_default DESC, l.name ASC
    `;
    const res = await dbSelect(query, [inventoryItemId]);
    return res as unknown as InventoryLocationStock[];
  },

  async getStockInLocation(locationId: string, inventoryItemId: string, inventoryBatchId: string | null): Promise<number> {
    const query = inventoryBatchId 
      ? `SELECT quantity FROM inventory_location_stocks WHERE location_id = $1 AND inventory_item_id = $2 AND inventory_batch_id = $3`
      : `SELECT quantity FROM inventory_location_stocks WHERE location_id = $1 AND inventory_item_id = $2 AND inventory_batch_id IS NULL`;
    
    const params = inventoryBatchId ? [locationId, inventoryItemId, inventoryBatchId] : [locationId, inventoryItemId];
    const res = await dbSelect(query, params);
    return res.length > 0 ? Number(res[0].quantity) : 0;
  },

  async findLocationWithStock(inventoryItemId: string, inventoryBatchId: string | null, quantity: number): Promise<string | null> {
    const query = inventoryBatchId
      ? `
        SELECT location_id
        FROM inventory_location_stocks
        WHERE inventory_item_id = $1 AND inventory_batch_id = $2 AND quantity >= $3
        ORDER BY location_id = 'default-location' DESC, updated_at ASC
        LIMIT 1
      `
      : `
        SELECT location_id
        FROM inventory_location_stocks
        WHERE inventory_item_id = $1 AND inventory_batch_id IS NULL AND quantity >= $2
        ORDER BY location_id = 'default-location' DESC, updated_at ASC
        LIMIT 1
      `;
    const params = inventoryBatchId ? [inventoryItemId, inventoryBatchId, quantity] : [inventoryItemId, quantity];
    const res = await dbSelect<{ location_id: string }>(query, params);
    return res[0]?.location_id ?? null;
  },

  async addStockToLocation(locationId: string, inventoryItemId: string, inventoryBatchId: string | null, quantity: number): Promise<void> {
    const id = crypto.randomUUID();
    await dbExecute(
      `INSERT INTO inventory_location_stocks (id, location_id, inventory_item_id, inventory_batch_id, quantity)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = datetime('now')`,
      [id, locationId, inventoryItemId, inventoryBatchId, quantity]
    );
  },

  async removeStockFromLocation(locationId: string, inventoryItemId: string, inventoryBatchId: string | null, quantity: number): Promise<void> {
    const query = inventoryBatchId
      ? `UPDATE inventory_location_stocks SET quantity = quantity - $1, updated_at = datetime('now') 
         WHERE location_id = $2 AND inventory_item_id = $3 AND inventory_batch_id = $4 AND quantity >= $1`
      : `UPDATE inventory_location_stocks SET quantity = quantity - $1, updated_at = datetime('now') 
         WHERE location_id = $2 AND inventory_item_id = $3 AND inventory_batch_id IS NULL AND quantity >= $1`;
         
    const params = inventoryBatchId 
      ? [quantity, locationId, inventoryItemId, inventoryBatchId]
      : [quantity, locationId, inventoryItemId];

    await dbExecuteRequired(query, params);
  },

  async recordTransfer(
    id: string,
    inventoryItemId: string,
    inventoryBatchId: string | null,
    fromLocationId: string,
    toLocationId: string,
    quantity: number,
    userId: string | null,
    notes?: string
  ): Promise<void> {
    await dbExecute(
      `INSERT INTO inventory_transfers (id, inventory_item_id, inventory_batch_id, from_location_id, to_location_id, quantity, user_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, inventoryItemId, inventoryBatchId || null, fromLocationId, toLocationId, quantity, userId || null, notes || null]
    );
  },

  async listTransfers(inventoryItemId: string): Promise<InventoryTransfer[]> {
    const query = `
      SELECT 
        t.*,
        lf.name as from_location_name,
        lt.name as to_location_name
      FROM inventory_transfers t
      JOIN inventory_locations lf ON lf.id = t.from_location_id
      JOIN inventory_locations lt ON lt.id = t.to_location_id
      WHERE t.inventory_item_id = $1
      ORDER BY t.transfer_date DESC
    `;
    const res = await dbSelect(query, [inventoryItemId]);
    return res as unknown as InventoryTransfer[];
  }
};
