import { stockForecastRepository } from "../repositories/stockForecast.repository";
import type { InventoryItem, StockForecast, StockRiskLevel } from "../types";
import { format, addDays } from "date-fns";

export const stockForecastService = {
  async appendForecastToItems(items: InventoryItem[]): Promise<InventoryItem[]> {
    if (items.length === 0) return items;

    const itemIds = items.map(i => i.id);
    const stats = await stockForecastRepository.getConsumptionStats(itemIds);
    const statsMap = new Map(stats.map(s => [s.inventoryItemId, s]));

    return items.map(item => {
      const stat = statsMap.get(item.id);
      
      let averageDailyConsumption = 0;
      let daysUntilStockout: number | null = null;
      let riskLevel: StockRiskLevel = 'insufficient_history';
      let estimatedStockoutDate: string | null = null;

      // Se temos dados suficientes (ex: pelo menos 1 dia de histórico e algum consumo)
      if (stat && stat.daysWithHistory > 0 && stat.totalConsumption90Days > 0) {
        averageDailyConsumption = stat.totalConsumption90Days / stat.daysWithHistory;
        
        if (averageDailyConsumption > 0) {
          daysUntilStockout = Math.floor(item.current_stock / averageDailyConsumption);
          
          if (daysUntilStockout < 7) {
            riskLevel = 'critical';
          } else if (daysUntilStockout < 15) {
            riskLevel = 'high';
          } else if (daysUntilStockout < 30) {
            riskLevel = 'medium';
          } else {
            riskLevel = 'low';
          }

          if (item.current_stock <= 0) {
            riskLevel = 'critical';
            daysUntilStockout = 0;
          }

          const stockoutDate = addDays(new Date(), daysUntilStockout);
          estimatedStockoutDate = format(stockoutDate, "yyyy-MM-dd");
        }
      } else if (item.current_stock <= 0) {
        riskLevel = 'critical';
        daysUntilStockout = 0;
        estimatedStockoutDate = format(new Date(), "yyyy-MM-dd");
      }

      const forecast: StockForecast = {
        inventoryItemId: item.id,
        averageDailyConsumption,
        availableStock: item.current_stock,
        daysUntilStockout,
        riskLevel,
        estimatedStockoutDate,
      };

      return {
        ...item,
        forecast
      };
    });
  }
};
