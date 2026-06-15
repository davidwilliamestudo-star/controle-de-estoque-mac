import { dbSelect } from "@/lib/db/sqlite";
import type { PurchaseRecommendation } from "../types";

export const purchasePlanningRepository = {
  async getInventoryDataForPurchasePlan(): Promise<any[]> {
    const query = `
      SELECT 
        i.id as inventoryItemId,
        i.name as itemName,
        i.item_type as itemType,
        i.unit,
        i.current_stock as currentStock,
        i.minimum_stock as minimumStock,
        i.supplier_id as defaultSupplierId,
        s.name as defaultSupplierName,
        (
          SELECT unit_cost 
          FROM inventory_batches b 
          WHERE b.inventory_item_id = i.id AND b.unit_cost IS NOT NULL 
          ORDER BY b.entry_date DESC 
          LIMIT 1
        ) as lastUnitCost,
        (
          SELECT SUM(current_quantity)
          FROM inventory_batches b 
          WHERE b.inventory_item_id = i.id 
            AND b.expiration_date IS NOT NULL 
            AND b.expiration_date <= date('now', '+30 days')
            AND b.current_quantity > 0
        ) as expiringStock,
        (
          SELECT SUM(current_quantity)
          FROM inventory_batches b 
          WHERE b.inventory_item_id = i.id 
            AND b.expiration_date IS NOT NULL 
            AND b.expiration_date < date('now')
            AND b.current_quantity > 0
        ) as expiredStock
      FROM inventory_items i
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE i.is_active = 1
    `;

    return dbSelect(query);
  }
};
