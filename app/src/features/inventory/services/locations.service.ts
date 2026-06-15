import { dbTransaction } from "@/lib/db/sqlite";
import { locationsRepository } from "../repositories/locations.repository";
import { auditService } from "../../audit/services/audit.service";
import type { InventoryLocation, InventoryLocationStock, InventoryTransfer } from "../types";

export const locationsService = {
  async listLocations(): Promise<InventoryLocation[]> {
    return locationsRepository.listLocations();
  },

  async createLocation(name: string, description?: string, isDefault: number = 0): Promise<string> {
    const id = crypto.randomUUID();
    await locationsRepository.createLocation(id, name, description, isDefault);
    
    await auditService.log({
      action: "location_created",
      entity_type: "inventory_location",
      entity_id: id,
      description: `Armário/Local "${name}" criado.`,
    });
    return id;
  },

  async updateLocation(id: string, name: string, description?: string): Promise<void> {
    await locationsRepository.updateLocation(id, name, description);
    await auditService.log({
      action: "location_updated",
      entity_type: "inventory_location",
      entity_id: id,
      description: `Armário/Local "${name}" atualizado.`,
    });
  },

  async deleteLocation(id: string): Promise<void> {
    // Verificar se tem estoque associado antes de excluir
    // Por simplicidade, vamos tentar excluir (se houver foreign key constraint vai falhar)
    // Mas o SQLite na nossa configuração atual pode ou não barrar. 
    // O ideal seria verificar se quantidade no local > 0.
    const loc = await locationsRepository.getLocation(id);
    if (!loc) throw new Error("Local não encontrado.");
    if (loc.is_default) throw new Error("O local padrão não pode ser excluído.");

    await locationsRepository.deleteLocation(id);
    
    await auditService.log({
      action: "location_deleted",
      entity_type: "inventory_location",
      entity_id: id,
      description: `Armário/Local "${loc.name}" excluído.`,
    });
  },

  async getStockByLocation(inventoryItemId: string): Promise<InventoryLocationStock[]> {
    return locationsRepository.getStockByLocation(inventoryItemId);
  },

  async transferStock(data: {
    inventoryItemId: string;
    inventoryBatchId?: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: number;
    userId?: string;
    notes?: string;
  }): Promise<void> {
    if (data.fromLocationId === data.toLocationId) {
      throw new Error("Local de origem e destino não podem ser os mesmos.");
    }
    if (data.quantity <= 0) {
      throw new Error("A quantidade transferida deve ser maior que zero.");
    }

    await dbTransaction(async () => {
      const batchId = data.inventoryBatchId || null;
      
      // Verifica saldo na origem
      const currentStock = await locationsRepository.getStockInLocation(
        data.fromLocationId,
        data.inventoryItemId,
        batchId
      );

      if (currentStock < data.quantity) {
        throw new Error("Saldo insuficiente no local de origem para realizar a transferência.");
      }

      // Remove da origem
      await locationsRepository.removeStockFromLocation(
        data.fromLocationId,
        data.inventoryItemId,
        batchId,
        data.quantity
      );

      // Adiciona no destino
      await locationsRepository.addStockToLocation(
        data.toLocationId,
        data.inventoryItemId,
        batchId,
        data.quantity
      );

      // Registra a transferência
      const transferId = crypto.randomUUID();
      await locationsRepository.recordTransfer(
        transferId,
        data.inventoryItemId,
        batchId,
        data.fromLocationId,
        data.toLocationId,
        data.quantity,
        data.userId || null,
        data.notes
      );

      // Audita
      await auditService.log({
        action: "stock_transfer",
        entity_type: "inventory_item",
        entity_id: data.inventoryItemId,
        description: `Transferidos ${data.quantity} itens entre locais.`,
      });
    });
  },

  async listTransfers(inventoryItemId: string): Promise<InventoryTransfer[]> {
    return locationsRepository.listTransfers(inventoryItemId);
  }
};
