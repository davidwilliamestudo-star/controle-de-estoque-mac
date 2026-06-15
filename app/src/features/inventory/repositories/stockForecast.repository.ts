import { dbSelect } from "@/lib/db/sqlite";

export interface ConsumptionStats {
  inventoryItemId: string;
  totalConsumption90Days: number;
  firstConsumptionDate: string | null;
  lastConsumptionDate: string | null;
  daysWithHistory: number;
}

export const stockForecastRepository = {
  async getConsumptionStats(itemIds?: string[]): Promise<ConsumptionStats[]> {
    let query = `
      SELECT 
        inventory_item_id as inventoryItemId,
        SUM(ABS(quantity)) as totalConsumption90Days,
        MIN(date(created_at)) as firstConsumptionDate,
        MAX(date(created_at)) as lastConsumptionDate,
        CAST(julianday('now') - julianday(MIN(created_at)) AS INTEGER) as daysSinceFirstConsumption
      FROM stock_movements
      WHERE 
        (movement_type = 'automatic_exit' OR movement_type = 'manual_exit' OR (movement_type = 'adjustment' AND quantity < 0))
        AND created_at >= datetime('now', '-90 days')
    `;

    const args: any[] = [];
    if (itemIds && itemIds.length > 0) {
      const placeholders = itemIds.map(() => '?').join(',');
      query += ` AND inventory_item_id IN (${placeholders})`;
      args.push(...itemIds);
    }

    query += ` GROUP BY inventory_item_id`;

    const rows = await dbSelect(query, args);

    return rows.map(row => {
      // O histórico útil é limitado a 90 dias ou os dias desde a primeira movimentação se < 90
      let daysWithHistory = Number(row.daysSinceFirstConsumption) || 1;
      if (daysWithHistory > 90) daysWithHistory = 90;
      if (daysWithHistory < 1) daysWithHistory = 1;

      return {
        inventoryItemId: row.inventoryItemId as string,
        // adjustment is negative, exit is negative or positive? Exit should be recorded as positive if it's "quantity", 
        // wait, usually exits are recorded as positive quantity and the logic deducts it, or negative quantity.
        // I will use Math.abs() to be safe.
        totalConsumption90Days: Math.abs(Number(row.totalConsumption90Days) || 0),
        firstConsumptionDate: row.firstConsumptionDate as string | null,
        lastConsumptionDate: row.lastConsumptionDate as string | null,
        daysWithHistory
      };
    });
  }
};
