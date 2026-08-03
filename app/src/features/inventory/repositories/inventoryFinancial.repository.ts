import { dbSelect } from "@/lib/db/sqlite";

export const inventoryFinancialRepository = {
  /**
   * Pega o valor atual em estoque cruzando os itens com saldo > 0 
   * e o custo do lote mais recente.
   */
  async getInventoryValueStatus(): Promise<any[]> {
    const query = `
      SELECT 
        i.id,
        i.name,
        i.item_type,
        c.name as category_name,
        i.current_stock,
        i.unit,
        COALESCE(
          (SELECT b.unit_cost 
           FROM inventory_batches b 
           WHERE b.inventory_item_id = i.id AND b.unit_cost IS NOT NULL 
           ORDER BY b.created_at DESC LIMIT 1),
          0
        ) as unit_cost
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON c.id = i.category_id
      WHERE i.current_stock > 0 AND i.is_active = 1
    `;
    
    return dbSelect(query);
  },

  /**
   * Histórico de consumo e perdas em um período.
   */
  async getConsumptionHistory(startDate: string, endDate: string): Promise<any[]> {
    const query = `
      SELECT 
        sm.id,
        sm.movement_type,
        sm.quantity,
        sm.movement_date,
        sm.protocol_id,
        sm.patient_id,
        i.item_type,
        i.name as item_name,
        COALESCE(b.unit_cost, 
          (SELECT unit_cost FROM inventory_batches ib WHERE ib.inventory_item_id = i.id AND ib.unit_cost IS NOT NULL ORDER BY ib.created_at DESC LIMIT 1), 
          0
        ) as unit_cost
      FROM stock_movements sm
      JOIN inventory_items i ON i.id = sm.inventory_item_id
      LEFT JOIN inventory_batches b ON b.id = sm.inventory_batch_id
      WHERE sm.movement_type IN ('exit', 'automatic_exit', 'loss', 'expired')
        AND date(sm.movement_date) >= date(?)
        AND date(sm.movement_date) <= date(?)
    `;
    
    return dbSelect(query, [startDate, endDate]);
  },

  /**
   * Itens com saldo em estoque mas que nunca tiveram valor de compra registrado.
   */
  async getItemsWithoutCost(): Promise<any[]> {
    const query = `
      SELECT 
        i.id,
        i.name,
        i.current_stock,
        i.unit
      FROM inventory_items i
      WHERE i.current_stock > 0 AND i.is_active = 1
        AND (
          SELECT COUNT(*) 
          FROM inventory_batches b 
          WHERE b.inventory_item_id = i.id AND b.unit_cost IS NOT NULL AND b.unit_cost > 0
        ) = 0
    `;
    return dbSelect(query);
  },

  /**
   * Perdas Estimadas por Vencimento Próximo
   * Itens com lotes ativos que vencem nos próximos 30 dias.
   */
  async getEstimatedLosses(): Promise<any[]> {
    const query = `
      SELECT 
        i.name,
        b.batch_number,
        b.expiration_date,
        b.current_quantity,
        b.unit_cost,
        i.unit
      FROM inventory_batches b
      JOIN inventory_items i ON i.id = b.inventory_item_id
      WHERE b.current_quantity > 0 
        AND b.expiration_date IS NOT NULL
        AND date(b.expiration_date) <= date('now', '+30 days')
        AND date(b.expiration_date) >= date('now')
    `;
    return dbSelect(query);
  },

  /**
   * Custo de reposição (itens abaixo do mínimo x último custo).
   */
  async getReplacementCost(): Promise<any[]> {
    const query = `
      SELECT 
        i.name,
        i.current_stock,
        i.minimum_stock,
        i.unit,
        (i.minimum_stock - i.current_stock) as missing_quantity,
        COALESCE(
          (SELECT b.unit_cost 
           FROM inventory_batches b 
           WHERE b.inventory_item_id = i.id AND b.unit_cost IS NOT NULL 
           ORDER BY b.created_at DESC LIMIT 1),
          0
        ) as unit_cost
      FROM inventory_items i
      WHERE i.is_active = 1 AND i.current_stock < i.minimum_stock
    `;
    return dbSelect(query);
  }
};
