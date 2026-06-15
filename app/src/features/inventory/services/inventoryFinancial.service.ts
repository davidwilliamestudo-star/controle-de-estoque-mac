import { inventoryFinancialRepository } from "../repositories/inventoryFinancial.repository";

export interface InventoryFinancialSummary {
  totalValue: number;
  valueByType: Record<string, number>;
  valueByCategory: Record<string, number>;
  consumptionCost: number;
  consumptionByProtocol: Record<string, number>;
  lossCost: number; // Vencidos e perdas
  estimatedLossesValue: number;
  replacementCost: number;
  itemsWithoutPriceCount: number;
}

export const inventoryFinancialService = {
  /**
   * Obtém um resumo financeiro geral do estoque
   */
  async getDashboardSummary(days: number = 30): Promise<InventoryFinancialSummary> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const [
      stockItems,
      consumption,
      itemsNoCost,
      estimatedLosses,
      replacementItems
    ] = await Promise.all([
      inventoryFinancialRepository.getInventoryValueStatus(),
      inventoryFinancialRepository.getConsumptionHistory(startStr, endStr),
      inventoryFinancialRepository.getItemsWithoutCost(),
      inventoryFinancialRepository.getEstimatedLosses(),
      inventoryFinancialRepository.getReplacementCost()
    ]);

    // 1. Processar Valor em Estoque
    let totalValue = 0;
    const valueByType: Record<string, number> = {};
    const valueByCategory: Record<string, number> = {};

    stockItems.forEach(item => {
      const value = Number(item.current_stock || 0) * Number(item.unit_cost || 0);
      totalValue += value;
      
      const typeStr = item.item_type || "Outros";
      valueByType[typeStr] = (valueByType[typeStr] || 0) + value;
      
      const catStr = item.category_name || "Sem Categoria";
      valueByCategory[catStr] = (valueByCategory[catStr] || 0) + value;
    });

    // 2. Processar Consumo e Perdas
    let consumptionCost = 0;
    let lossCost = 0;
    const consumptionByProtocol: Record<string, number> = {};

    consumption.forEach(mov => {
      const value = Number(mov.quantity || 0) * Number(mov.unit_cost || 0);
      if (mov.movement_type === "loss" || mov.movement_type === "expired") {
        lossCost += value;
      } else {
        consumptionCost += value;
        const proto = mov.protocol_id || "Geral/Sem Protocolo";
        consumptionByProtocol[proto] = (consumptionByProtocol[proto] || 0) + value;
      }
    });

    // 3. Processar Perdas Estimadas (que vão vencer em 30 dias)
    let estimatedLossesValue = 0;
    estimatedLosses.forEach(loss => {
      estimatedLossesValue += Number(loss.current_quantity || 0) * Number(loss.unit_cost || 0);
    });

    // 4. Custo de reposição (itens abaixo do mínimo)
    let replacementCost = 0;
    replacementItems.forEach(rep => {
      if (rep.missing_quantity > 0) {
        replacementCost += Number(rep.missing_quantity) * Number(rep.unit_cost || 0);
      }
    });

    return {
      totalValue,
      valueByType,
      valueByCategory,
      consumptionCost,
      consumptionByProtocol,
      lossCost,
      estimatedLossesValue,
      replacementCost,
      itemsWithoutPriceCount: itemsNoCost.length
    };
  },

  async getItemsWithoutCost(): Promise<any[]> {
    return inventoryFinancialRepository.getItemsWithoutCost();
  }
};
