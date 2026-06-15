import { dbTransaction } from "@/lib/db/sqlite";
import type { XmlParsedData } from "./xmlImport.service";
import { auditService } from "@/features/audit/services/audit.service";
import { getStoredAuthSession } from "@/features/auth/session";
import { labelsService } from "@/features/labels/services/labels.service";
import { batchRepository } from "../repositories/batch.repository";
import { inventoryReceiptRepository } from "../repositories/inventoryReceipt.repository";
import { inventoryRepository } from "../repositories/inventory.repository";
import { stockMovementRepository } from "../repositories/stockMovement.repository";
import { suppliersRepository } from "../repositories/suppliers.repository";
import { locationsRepository } from "../repositories/locations.repository";
import type { InventoryEntryResult, ManualInventoryEntryInput } from "../types";

function normalizeDate(value?: string): string | undefined {
  return value?.trim() || undefined;
}

function isExpired(date?: string): boolean {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00`);
  return target < today;
}

function requiresBatchAndExpiration(itemType: string): boolean {
  return itemType === "medication" || itemType === "material";
}

function assertValidManualEntry(input: ManualInventoryEntryInput): number {
  if (input.commercialQuantity <= 0) {
    throw new Error("A quantidade comercial deve ser maior que zero.");
  }

  if (input.contentPerCommercialUnit <= 0) {
    throw new Error("O conteudo por unidade deve ser maior que zero.");
  }

  const totalControlQuantity = input.commercialQuantity * input.contentPerCommercialUnit;
  if (totalControlQuantity <= 0) {
    throw new Error("A quantidade total controlada deve ser maior que zero.");
  }

  if (!input.inventoryItemId) {
    throw new Error("Selecione um item existente.");
  }

  if (requiresBatchAndExpiration(input.itemType)) {
    if (!input.batchNumber?.trim()) {
      throw new Error("Medicamentos e materiais exigem lote.");
    }
    if (!input.expirationDate) {
      throw new Error("Medicamentos e materiais exigem validade.");
    }
  }

  if (isExpired(input.expirationDate) && requiresBatchAndExpiration(input.itemType)) {
    throw new Error("Nao e permitido dar entrada em medicamento ou material vencido.");
  }

  if (input.generateLabels && (!input.labelTemplateId || input.labelQuantity <= 0)) {
    throw new Error("Para gerar etiquetas, selecione um template e informe uma quantidade maior que zero.");
  }

  return totalControlQuantity;
}

export const inventoryReceiptService = {
  async createManualEntry(input: ManualInventoryEntryInput): Promise<InventoryEntryResult> {
    const totalControlQuantity = assertValidManualEntry(input);
    const session = getStoredAuthSession();

    return dbTransaction(async () => {
      const supplierName = input.supplierName.trim();
      let supplierId = input.supplierId || undefined;

      if (!supplierId && supplierName) {
        const existingSupplier = await suppliersRepository.findByName(supplierName);
        if (existingSupplier) {
          supplierId = existingSupplier.id;
        } else {
          supplierId = crypto.randomUUID();
          await suppliersRepository.create(supplierId, supplierName);
        }
      }

      const itemId = input.inventoryItemId;
      if (!itemId) {
        throw new Error("Nao foi possivel identificar o item de estoque.");
      }

      const existingItem = await inventoryRepository.findItemById(itemId);
      if (!existingItem) {
        throw new Error("Item de estoque selecionado nao foi encontrado.");
      }
      const itemName = existingItem.name;
      
      await inventoryRepository.updateItem(itemId, {
        categoryId: input.categoryId || null,
        administrationRouteId: input.administrationRouteId || null,
        unit: input.controlUnit,
        minimumStock: input.minimumStock,
      });

      await inventoryRepository.updateDefaultSupplier(itemId, supplierId ?? null);

      const receiptId = crypto.randomUUID();
      const receiptItemId = crypto.randomUUID();
      const batchId = crypto.randomUUID();
      const movementId = crypto.randomUUID();
      const batchNumber = input.batchNumber?.trim() || `AUTO-${batchId.slice(0, 8).toUpperCase()}`;
      const unitCost = input.unitCost ?? undefined;
      const totalCost = unitCost !== undefined ? unitCost * input.commercialQuantity : undefined;

      await inventoryReceiptRepository.createReceipt(receiptId, {
        receiptType: "manual",
        supplierId: supplierId ?? null,
        supplierNameSnapshot: supplierName || null,
        invoiceNumber: input.invoiceNumber || null,
        invoiceKey: input.invoiceKey || null,
        entryDate: input.entryDate,
        notes: input.receiptNotes || null,
        createdByUserId: session?.userId ?? null,
      });

      await batchRepository.create(batchId, {
        inventoryItemId: itemId,
        batchNumber,
        expirationDate: normalizeDate(input.expirationDate) ?? null,
        supplierId: supplierId ?? null,
        entryDate: input.entryDate,
        quantity: totalControlQuantity,
        unitCost: unitCost ?? null,
        invoiceNumber: input.invoiceNumber || null,
        notes: input.notes || null,
      });

      await inventoryReceiptRepository.createReceiptItem(receiptItemId, {
        receiptId,
        inventoryItemId: itemId,
        rawProductName: itemName,
        rawUnit: input.commercialUnit,
        rawQuantity: input.commercialQuantity,
        commercialQuantity: input.commercialQuantity,
        commercialUnit: input.commercialUnit,
        contentPerCommercialUnit: input.contentPerCommercialUnit,
        controlUnit: input.controlUnit,
        totalControlQuantity,
        batchNumber,
        expirationDate: normalizeDate(input.expirationDate) ?? null,
        manufacturingDate: normalizeDate(input.manufacturingDate) ?? null,
        supplierId: supplierId ?? null,
        unitCost: unitCost ?? null,
        totalCost: totalCost ?? null,
        notes: input.notes || null,
      });

      await stockMovementRepository.createEntry(movementId, {
        inventoryItemId: itemId,
        inventoryBatchId: batchId,
        quantity: totalControlQuantity,
        unit: input.controlUnit,
        reason: "Entrada manual de estoque",
        userId: session?.userId ?? null,
        notes: input.notes || null,
        locationId: input.locationId || "default-location",
      });

      await inventoryRepository.incrementCurrentStock(itemId, totalControlQuantity);

      await locationsRepository.addStockToLocation(input.locationId || "default-location", itemId, batchId, totalControlQuantity);

      await auditService.log({
        action: "inventory_manual_entry_created",
        entity_type: "inventory_receipt",
        entity_id: receiptId,
        description: `Entrada manual registrada para ${itemName}.`,
        after_data: {
          itemId,
          batchId,
          batchNumber,
          totalControlQuantity,
          unit: input.controlUnit,
          invoiceNumber: input.invoiceNumber,
        },
      });

      await auditService.log({
        action: "inventory_batch_created",
        entity_type: "inventory_batch",
        entity_id: batchId,
        description: `Lote "${batchNumber}" criado para ${itemName}.`,
        after_data: { itemId, totalControlQuantity, expirationDate: input.expirationDate },
      });

      await auditService.log({
        action: "stock_entry_movement_created",
        entity_type: "stock_movement",
        entity_id: movementId,
        description: `Movimentacao de entrada de ${totalControlQuantity} ${input.controlUnit} para ${itemName}.`,
        after_data: { itemId, batchId, quantity: totalControlQuantity, unit: input.controlUnit },
      });

      let labelJobId: string | undefined;
      if (input.generateLabels && input.labelTemplateId) {
        labelJobId = await labelsService.createBatchLabelJob({
          itemId,
          itemName,
          batchId,
          batchNumber,
          expirationDate: normalizeDate(input.expirationDate) ?? null,
          quantity: input.labelQuantity,
          templateId: input.labelTemplateId,
        });
      }

      return {
        receiptId,
        receiptItemId,
        itemId,
        batchId,
        totalControlQuantity,
        labelJobId,
      };
    });
  },

  async startXmlImport(filePath: string): Promise<void> {
    await auditService.log({
      action: "inventory_xml_import_started",
      entity_type: "inventory_receipt",
      description: "Importacao XML iniciada para revisao manual.",
      after_data: { filePath },
    });
  },

  async processXmlImport(parsedData: XmlParsedData): Promise<void> {
    const session = getStoredAuthSession();

    return dbTransaction(async () => {
      let supplierId = parsedData.supplier?.matchedSupplierId;

      if (!supplierId && parsedData.supplier && parsedData.supplier.isNewSupplier) {
        supplierId = crypto.randomUUID();
        await suppliersRepository.createFull(supplierId, {
          name: parsedData.supplier.name,
          document: parsedData.supplier.cnpj
        });
      }

      for (const item of parsedData.items) {
        let itemId = item.matchedInventoryItemId;

        if (!itemId && item.isNewItem) {
          itemId = crypto.randomUUID();
          await inventoryRepository.createItem(itemId, {
            name: item.xProd,
            itemType: "material", // Default
            unit: item.uCom,
            minimumStock: 0,
            requiresBatch: item.nLote ? true : false,
            requiresExpiration: item.dVal ? true : false,
            supplierId: supplierId,
            initialStock: 0
          });
        }

        if (!itemId) {
          continue; // Pular itens nao mapeados
        }

        const quantity = item.qCom;
        let batchId = undefined;

        if (item.nLote) {
          const expirationDate = item.dVal ? new Date(item.dVal).toISOString().split('T')[0] : undefined;
          
          batchId = crypto.randomUUID();
          await batchRepository.create(batchId, {
            inventoryItemId: itemId,
            batchNumber: item.nLote,
            expirationDate: expirationDate,
            entryDate: new Date().toISOString(),
            quantity: quantity,
            unitCost: item.vUnCom > 0 ? item.vUnCom : undefined,
            supplierId: supplierId
          });
          await locationsRepository.addStockToLocation("default-location", itemId, batchId, quantity);
        }

        // Add to main stock
        await inventoryRepository.incrementCurrentStock(itemId, quantity);
        
        // Update unit cost if valid
        if (item.vUnCom > 0) {
          await inventoryRepository.updateItem(itemId, { 
            // In the future: update last unit cost or something, for now just update item partially if possible.
          });
        }

        const movementId = crypto.randomUUID();
        await stockMovementRepository.createEntry(movementId, {
          inventoryItemId: itemId,
          inventoryBatchId: batchId ?? null,
          quantity: quantity,
          unit: item.uCom,
          reason: "Entrada via XML NF-e",
          userId: session?.userId || null,
          notes: `Custo Un: ${item.vUnCom}`,
          locationId: "default-location",
        });
      }

      await auditService.log({
        action: "inventory_xml_imported",
        entity_type: "inventory_receipt",
        description: `Importacao XML concluida. ${parsedData.items.length} itens processados.`,
        after_data: { supplier: parsedData.supplier?.name }
      });
    });
  },
};
