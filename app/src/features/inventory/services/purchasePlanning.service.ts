import { purchasePlanningRepository } from "../repositories/purchasePlanning.repository";
import type { PurchasePlan, PurchaseRecommendation, PurchaseReason } from "../types";

export const purchasePlanningService = {
  async generatePurchasePlan(): Promise<PurchasePlan> {
    const rawData = await purchasePlanningRepository.getInventoryDataForPurchasePlan();
    
    const recommendations: PurchaseRecommendation[] = [];
    let totalEstimatedCost = 0;

    for (const row of rawData) {
      const currentStock = Number(row.currentStock) || 0;
      const minimumStock = Number(row.minimumStock) || 0;
      const expiringStock = Number(row.expiringStock) || 0;
      const expiredStock = Number(row.expiredStock) || 0;
      const unitCost = Number(row.lastUnitCost) || 0;
      
      const reservedStock = 0; // TODO: Fetch from upcoming appointments in Phase 5
      const predictedConsumption = 0; // TODO: Fetch from upcoming appointments in Phase 5
      
      const availableStock = Math.max(0, currentStock - reservedStock - expiredStock);
      
      let suggestedQuantity = 0;
      const reasons: PurchaseReason[] = [];
      const reasonDescriptions: string[] = [];

      // Reason 1: Abaixo do mínimo
      if (availableStock < minimumStock) {
        reasons.push("abaixo_minimo");
        reasonDescriptions.push(`Estoque disponível (${availableStock}) está abaixo do mínimo (${minimumStock}).`);
        suggestedQuantity += (minimumStock - availableStock);
      }

      // Reason 2: Lote Vencendo
      if (expiringStock > 0 && (availableStock - expiringStock) < minimumStock) {
        if (!reasons.includes("lote_vencendo")) {
          reasons.push("lote_vencendo");
          reasonDescriptions.push(`${expiringStock} unidades vencem nos próximos 30 dias.`);
          // Adiciona a reposição do que vai vencer e causar furo
          suggestedQuantity += expiringStock;
        }
      }

      // Reason 3: Lote Vencido
      if (expiredStock > 0) {
        reasons.push("lote_vencido");
        reasonDescriptions.push(`${expiredStock} unidades já estão vencidas e não podem ser usadas.`);
        // Já foi descontado do availableStock, então a regra de 'abaixo_minimo' já cobre a reposição,
        // mas marcamos o motivo para o usuário saber por que caiu tanto.
      }

      // Reason 4: Item Crítico sem fornecedor
      if (minimumStock > 0 && availableStock <= 0 && !row.defaultSupplierId) {
        reasons.push("critico_sem_fornecedor");
        reasonDescriptions.push("Item crítico esgotado e sem fornecedor padrão definido.");
      }

      // Se há consumo previsto (Fase 5)
      if (predictedConsumption > 0 && (availableStock - predictedConsumption) < minimumStock) {
        reasons.push("consumo_alto");
        reasonDescriptions.push(`Consumo previsto de ${predictedConsumption} nas próximas aplicações.`);
        suggestedQuantity += predictedConsumption;
      }

      if (suggestedQuantity > 0 || reasons.length > 0) {
        // Garantir que a quantidade sugerida seja no mínimo o suficiente para voltar ao mínimo
        // e adicionar um buffer de 10% para não ficar sempre no limite, ou apenas o necessário.
        const finalQuantity = Math.max(suggestedQuantity, minimumStock - availableStock);
        const itemTotalCost = finalQuantity * unitCost;
        totalEstimatedCost += itemTotalCost;

        recommendations.push({
          inventoryItemId: row.inventoryItemId as string,
          itemName: row.itemName as string,
          itemType: row.itemType as string,
          unit: row.unit as string,
          currentStock,
          reservedStock,
          availableStock,
          minimumStock,
          predictedConsumption,
          suggestedQuantity: finalQuantity,
          unitCost,
          totalEstimatedCost: itemTotalCost,
          defaultSupplierId: row.defaultSupplierId as string | null,
          defaultSupplierName: row.defaultSupplierName as string | null,
          reasons,
          reasonDescriptions,
        });
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      recommendations,
      totalItems: recommendations.length,
      totalEstimatedCost,
    };
  }
};
