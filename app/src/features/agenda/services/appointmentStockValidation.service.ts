import { dbSelect } from "@/lib/db/sqlite";
import { StockValidationResult, StockValidationItem } from "../types/appointmentStockValidation";

export const appointmentStockValidationService = {
  async validateProtocolStock(
    protocolId: string, 
    excludeAppointmentId?: string
  ): Promise<StockValidationResult> {
    const protocolItems = await dbSelect<any>(
      `
      SELECT 
        pi.id as protocolItemId,
        pi.inventory_item_id as inventoryItemId,
        pi.default_quantity as requiredQuantity,
        i.name as itemName,
        i.unit,
        i.current_stock as currentStock
      FROM protocol_items pi
      JOIN inventory_items i ON pi.inventory_item_id = i.id
      WHERE pi.protocol_id = $1 AND pi.is_required = 1
      `,
      [protocolId]
    );

    const validationItems: StockValidationItem[] = [];
    let isSufficient = true;
    let hasWarnings = false;

    for (const item of protocolItems) {
      // 2. Calculate reserved stock
      let reservedQuery = `
        SELECT COALESCE(SUM(pi.default_quantity), 0) as reserved
        FROM appointments a
        JOIN patient_application_plans pap ON a.application_plan_id = pap.id
        JOIN protocol_items pi ON pap.protocol_id = pi.protocol_id
        WHERE a.status IN ('scheduled', 'confirmed')
          AND a.deleted_at IS NULL
          AND pap.deleted_at IS NULL
          AND pi.inventory_item_id = $1
      `;
      const reservedParams: any[] = [item.inventoryItemId];

      if (excludeAppointmentId) {
        reservedQuery += ` AND a.id != $2`;
        reservedParams.push(excludeAppointmentId);
      }

      const reservedResult = await dbSelect<any>(reservedQuery, reservedParams);
      const reservedStock = Number(reservedResult[0]?.reserved || 0);

      const currentStock = Number(item.currentStock || 0);
      const requiredQuantity = Number(item.requiredQuantity || 0);
      const availableStock = currentStock - reservedStock;

      // 3. Find suggested batch (oldest valid batch with enough stock, or just oldest valid)
      const batches = await dbSelect<any>(
        `
        SELECT id, batch_number, expiration_date, current_quantity
        FROM inventory_batches
        WHERE inventory_item_id = $1
          AND deleted_at IS NULL
          AND current_quantity > 0
          AND (expiration_date IS NULL OR expiration_date >= date('now'))
        ORDER BY 
          CASE WHEN expiration_date IS NULL THEN 1 ELSE 0 END,
          expiration_date ASC,
          created_at ASC
        LIMIT 1
        `,
        [item.inventoryItemId]
      );

      const suggestedBatch = batches[0];

      let status: "sufficient" | "warning" | "insufficient" = "sufficient";
      if (availableStock < requiredQuantity) {
        status = "insufficient";
        isSufficient = false;
      } else if (availableStock === requiredQuantity || availableStock < requiredQuantity * 2) {
        status = "warning";
        hasWarnings = true;
      }

      validationItems.push({
        protocolItemId: item.protocolItemId,
        inventoryItemId: item.inventoryItemId,
        itemName: item.itemName,
        unit: item.unit,
        requiredQuantity,
        currentStock,
        reservedStock,
        availableStock,
        suggestedBatchId: suggestedBatch?.id,
        suggestedBatchNumber: suggestedBatch?.batch_number,
        suggestedBatchExpiration: suggestedBatch?.expiration_date,
        status,
      });
    }

    return {
      isSufficient,
      hasWarnings,
      items: validationItems,
    };
  },

  async validatePlanStock(
    applicationPlanId: string,
    excludeAppointmentId?: string
  ): Promise<StockValidationResult | null> {
    const plans = await dbSelect<any>(
      `SELECT protocol_id FROM patient_application_plans WHERE id = $1 AND deleted_at IS NULL`,
      [applicationPlanId]
    );

    if (plans.length === 0) return null;
    return this.validateProtocolStock(plans[0].protocol_id, excludeAppointmentId);
  }
};
