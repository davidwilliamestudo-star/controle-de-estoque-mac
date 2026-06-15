import { inventoryRepository } from "../repositories/inventory.repository";
import { suppliersRepository } from "../repositories/suppliers.repository";
import { stockMovementRepository } from "../repositories/stockMovement.repository";
import { labelsService } from "@/features/labels/services/labels.service";
import { locationsService } from "./locations.service";
import { auditService } from "@/features/audit/services/audit.service";
import { getStoredAuthSession } from "@/features/auth/session";
import { stockForecastService } from "./stockForecast.service";
import type { InventoryCategory, InventoryItem, InventoryItemType, InventoryItemUpdateInput, InventoryOptions, StockAdjustmentInput, Supplier } from "../types";
import { dbTransaction } from "@/lib/db/sqlite";

export const inventoryService = {
  async listInventory(): Promise<InventoryItem[]> {
    const items = await inventoryRepository.listItems();
    return stockForecastService.appendForecastToItems(items);
  },

  async listInventoryByType(itemType: InventoryItemType): Promise<InventoryItem[]> {
    const items = await inventoryRepository.listItemsByType(itemType);
    return stockForecastService.appendForecastToItems(items);
  },

  async getInventoryItem(id: string): Promise<InventoryItem | null> {
    return inventoryRepository.findItemById(id);
  },

  async listCategories(): Promise<InventoryCategory[]> {
    return inventoryRepository.listCategories();
  },

  async listSuppliers(): Promise<Supplier[]> {
    return suppliersRepository.list();
  },

  async getInventoryOptions(): Promise<InventoryOptions> {
    const [items, categories, administrationRoutes, labelTemplates, locations] = await Promise.all([
      inventoryRepository.listItems(),
      inventoryRepository.listCategories(),
      inventoryRepository.listAdministrationRoutes(),
      labelsService.listTemplates(),
      locationsService.listLocations(),
    ]);

    const suppliers = await suppliersRepository.list();

    return {
      items,
      categories,
      administrationRoutes,
      suppliers,
      labelTemplates,
      locations,
    };
  },

  async createCategory(data: { name: string; description?: string; appliesTo?: string }): Promise<string> {
    const name = data.name.trim();
    if (!name) {
      throw new Error("Informe o nome da categoria.");
    }

    const id = crypto.randomUUID();
    await inventoryRepository.createCategory(id, {
      name,
      description: data.description?.trim() || null,
      appliesTo: data.appliesTo || "all",
    });

    await auditService.log({
      action: "inventory_category_created",
      entity_type: "inventory_category",
      entity_id: id,
      description: `Categoria "${name}" criada.`,
      after_data: { name, appliesTo: data.appliesTo || "all" },
    });

    return id;
  },

  async updateCategory(id: string, data: { name?: string; description?: string; appliesTo?: string }): Promise<void> {
    await inventoryRepository.updateCategory(id, {
      name: data.name,
      description: data.description,
      appliesTo: data.appliesTo,
    });

    await auditService.log({
      action: "inventory_category_updated",
      entity_type: "inventory_category",
      entity_id: id,
      description: `Categoria atualizada.`,
      after_data: data,
    });
  },

  async deleteCategory(id: string): Promise<void> {
    const inUse = await inventoryRepository.isCategoryInUse(id);
    if (inUse) {
      // Regra de exclusão e inativação solicitada
      await inventoryRepository.softDeleteCategory(id);
      await auditService.log({
        action: "inventory_category_inactivated",
        entity_type: "inventory_category",
        entity_id: id,
        description: `Categoria inativada (soft delete) porque estava em uso.`,
      });
      return;
    }

    // Se nao tiver em uso, inativa do mesmo jeito para preservar historico (ou excluiria se quisesse, mas soft delete eh a regra geral padrao e segura)
    await inventoryRepository.softDeleteCategory(id);
    await auditService.log({
      action: "inventory_category_deleted",
      entity_type: "inventory_category",
      entity_id: id,
      description: `Categoria excluída logicamente.`,
    });
  },

  async createSupplier(data: { name: string; phone?: string; email?: string; document?: string; contact_name?: string; address?: string; notes?: string }): Promise<string> {
    const name = data.name.trim();
    if (!name) {
      throw new Error("O nome do fornecedor é obrigatório.");
    }

    const existing = await suppliersRepository.findByName(name);
    if (existing) {
      throw new Error("Já existe um fornecedor com este nome.");
    }

    const id = crypto.randomUUID();
    await suppliersRepository.createFull(id, {
      name,
      phone: data.phone,
      email: data.email,
      document: data.document,
      contact_name: data.contact_name,
      address: data.address,
      notes: data.notes,
    });

    await auditService.log({
      action: "supplier_created",
      entity_type: "supplier",
      entity_id: id,
      description: `Fornecedor "${name}" criado.`,
      after_data: { ...data, name },
    });

    return id;
  },

  async updateSupplier(id: string, data: { name?: string; phone?: string; email?: string; document?: string; contact_name?: string; address?: string; notes?: string }): Promise<void> {
    await suppliersRepository.update(id, data);
    
    await auditService.log({
      action: "supplier_updated",
      entity_type: "supplier",
      entity_id: id,
      description: `Fornecedor atualizado.`,
      after_data: data,
    });
  },

  async deleteSupplier(id: string): Promise<void> {
    const inUse = await suppliersRepository.isSupplierInUse(id);
    if (inUse) {
      await suppliersRepository.softDelete(id);
      await auditService.log({
        action: "supplier_inactivated",
        entity_type: "supplier",
        entity_id: id,
        description: `Fornecedor inativado (soft delete) porque estava em uso.`,
      });
      return;
    }

    await suppliersRepository.softDelete(id);
    await auditService.log({
      action: "supplier_deleted",
      entity_type: "supplier",
      entity_id: id,
      description: `Fornecedor excluído logicamente.`,
    });
  },

  async createInventoryItem(data: InventoryItemUpdateInput): Promise<string> {
    const name = data.name.trim();
    if (!name) throw new Error("Informe o nome do item.");
    if (!data.unit.trim()) throw new Error("Informe a unidade de controle.");
    if (data.minimumStock < 0) throw new Error("O estoque mínimo não pode ser negativo.");

    const id = crypto.randomUUID();
    await inventoryRepository.createItem(id, {
      ...data,
      name,
      unit: data.unit.trim(),
      categoryId: data.categoryId || null,
      administrationRouteId: data.administrationRouteId || null,
      supplierId: data.supplierId || null,
      notes: data.notes?.trim() || null,
    });

    await auditService.log({
      action: "inventory_item_created",
      entity_type: "inventory_item",
      entity_id: id,
      description: `Item de estoque "${name}" criado.`,
      after_data: data,
    });

    return id;
  },

  async listAdministrationRoutes(): Promise<any[]> {
    return inventoryRepository.listAdministrationRoutes();
  },

  async createAdministrationRoute(data: { name: string; description?: string }): Promise<string> {
    const name = data.name.trim();
    if (!name) throw new Error("Informe o nome da via.");
    const id = crypto.randomUUID();
    await inventoryRepository.createAdministrationRoute(id, name, data.description);
    await auditService.log({
      action: "route_created",
      entity_type: "administration_route",
      entity_id: id,
      description: `Via de aplicação "${name}" criada.`,
    });
    return id;
  },

  async updateAdministrationRoute(id: string, data: { name: string; description?: string }): Promise<void> {
    await inventoryRepository.updateAdministrationRoute(id, data.name, data.description);
    await auditService.log({
      action: "route_updated",
      entity_type: "administration_route",
      entity_id: id,
      description: `Via de aplicação atualizada.`,
    });
  },

  async deleteAdministrationRoute(id: string): Promise<void> {
    const inUse = await inventoryRepository.isRouteInUse(id);
    if (inUse) {
      await inventoryRepository.softDeleteAdministrationRoute(id);
      await auditService.log({
        action: "route_inactivated",
        entity_type: "administration_route",
        entity_id: id,
        description: `Via inativada (soft delete) porque estava em uso.`,
      });
      return;
    }
    await inventoryRepository.softDeleteAdministrationRoute(id);
    await auditService.log({
      action: "route_deleted",
      entity_type: "administration_route",
      entity_id: id,
      description: `Via excluída logicamente.`,
    });
  },

  async listBodyAreas(): Promise<any[]> {
    return inventoryRepository.listBodyAreas();
  },

  async updateBodyArea(id: string, data: { display_name?: string; description?: string }): Promise<void> {
    await inventoryRepository.updateBodyArea(id, data);
    await auditService.log({
      action: "body_area_updated",
      entity_type: "body_area",
      entity_id: id,
      description: `Área corporal atualizada.`,
    });
  },

  async deleteBodyArea(id: string): Promise<void> {
    const inUse = await inventoryRepository.isBodyAreaInUse(id);
    if (inUse) {
      await inventoryRepository.softDeleteBodyArea(id);
      await auditService.log({
        action: "body_area_inactivated",
        entity_type: "body_area",
        entity_id: id,
        description: `Área corporal inativada (soft delete) porque estava em uso (SVG mantido).`,
      });
      return;
    }
    await inventoryRepository.softDeleteBodyArea(id);
    await auditService.log({
      action: "body_area_deleted",
      entity_type: "body_area",
      entity_id: id,
      description: `Área corporal excluída logicamente (SVG mantido).`,
    });
  },

  async updateInventoryItem(id: string, data: InventoryItemUpdateInput): Promise<void> {
    const item = await inventoryRepository.findItemById(id);
    if (!item) {
      throw new Error("Item de estoque nao encontrado.");
    }

    const name = data.name.trim();
    if (!name) {
      throw new Error("Informe o nome do item.");
    }
    if (!data.unit.trim()) {
      throw new Error("Informe a unidade de controle.");
    }
    if (data.minimumStock < 0) {
      throw new Error("O estoque minimo nao pode ser negativo.");
    }

    await inventoryRepository.updateItem(id, {
      ...data,
      name,
      unit: data.unit.trim(),
      categoryId: data.categoryId || null,
      administrationRouteId: data.administrationRouteId || null,
      supplierId: data.supplierId || null,
      notes: data.notes?.trim() || null,
    });

    await auditService.log({
      action: "inventory_item_updated",
      entity_type: "inventory_item",
      entity_id: id,
      description: `Item de estoque "${name}" atualizado.`,
      before_data: item,
      after_data: data,
    });
  },

  async setInventoryItemActive(id: string, isActive: boolean): Promise<void> {
    const item = await inventoryRepository.findItemById(id);
    if (!item) {
      throw new Error("Item de estoque nao encontrado.");
    }

    await inventoryRepository.setActive(id, isActive);

    await auditService.log({
      action: isActive ? "inventory_item_reactivated" : "inventory_item_deactivated",
      entity_type: "inventory_item",
      entity_id: id,
      description: `Item de estoque "${item.name}" ${isActive ? "reativado" : "inativado"}.`,
      before_data: item,
      after_data: { is_active: isActive ? 1 : 0 },
    });
  },

  async deleteInventoryItem(id: string): Promise<void> {
    const item = await inventoryRepository.findItemById(id);
    if (!item) {
      throw new Error("Item de estoque nao encontrado.");
    }

    await inventoryRepository.softDeleteItem(id);

    await auditService.log({
      action: "inventory_item_deleted",
      entity_type: "inventory_item",
      entity_id: id,
      description: `Item de estoque "${item.name}" excluido logicamente.`,
      before_data: item,
    });
  },

  async adjustStock(input: StockAdjustmentInput): Promise<void> {
    const item = await inventoryRepository.findItemById(input.inventoryItemId);
    if (!item) {
      throw new Error("Item de estoque nao encontrado.");
    }
    if (!Number.isFinite(input.newQuantity) || input.newQuantity < 0) {
      throw new Error("Informe um saldo valido maior ou igual a zero.");
    }
    const reason = input.reason.trim();
    if (!reason) {
      throw new Error("Informe o motivo do acerto de estoque.");
    }

    const currentStock = Number(item.current_stock ?? 0);
    const delta = input.newQuantity - currentStock;
    const session = getStoredAuthSession();

    await dbTransaction(async () => {
      await inventoryRepository.setCurrentStock(item.id, input.newQuantity);
      await stockMovementRepository.createAdjustment(crypto.randomUUID(), {
        inventoryItemId: item.id,
        quantity: delta,
        unit: item.unit,
        reason,
        userId: session?.userId ?? null,
        notes: [
          `Saldo anterior: ${currentStock} ${item.unit}`,
          `Saldo ajustado: ${input.newQuantity} ${item.unit}`,
          input.notes?.trim() ? `Observacao: ${input.notes.trim()}` : null,
        ].filter(Boolean).join(" | "),
      });

      await auditService.log({
        action: "inventory_stock_adjusted",
        entity_type: "inventory_item",
        entity_id: item.id,
        description: `Acerto de estoque em "${item.name}": ${currentStock} -> ${input.newQuantity} ${item.unit}.`,
        before_data: { current_stock: currentStock },
        after_data: { current_stock: input.newQuantity, delta, reason, notes: input.notes ?? null },
      });
    });
  },
};
