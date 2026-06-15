import { dbExecute, dbSelect, dbTransaction } from "@/lib/db/sqlite";
import { proceduresRepository } from "../repositories/procedures.repository";
import { inventoryRepository } from "@/features/inventory/repositories/inventory.repository";
import { batchRepository } from "@/features/inventory/repositories/batch.repository";
import { locationsRepository } from "@/features/inventory/repositories/locations.repository";
import { auditService } from "@/features/audit/services/audit.service";
import { evolutionService } from "./evolution.service";
import type { ProcedureItemUsed } from "../types";

export interface ProcedureCorrectionInput {
  procedureId: string;
  userId: string;
  reason: string;
  regenerateEvolution: boolean;
  updates: {
    bodyAreaId?: string | null;
    intercurrence?: boolean;
    intercurrenceDescription?: string | null;
    notes?: string | null;
    items: Partial<ProcedureItemUsed>[];
  };
}

export const procedureCorrectionService = {
  async correctFinalizedProcedure(input: ProcedureCorrectionInput): Promise<void> {
    return dbTransaction(async () => {
      const { procedureId, userId, reason, updates, regenerateEvolution } = input;

      const oldProcedure = await proceduresRepository.findById(procedureId);
      if (!oldProcedure) throw new Error("Procedimento nao encontrado.");
      if (oldProcedure.status !== "finalized") throw new Error("Apenas procedimentos finalizados podem ser corrigidos.");

      const oldItems = await proceduresRepository.listItems(procedureId);
      const correctionGroupId = crypto.randomUUID();
      const now = new Date().toISOString();

      const oldMap = new Map<string, { itemId: string; batchId: string | null; qty: number; unit: string }>();
      for (const item of oldItems) {
        if (!item.inventoryItemId) continue;
        const key = `${item.inventoryItemId}|${item.inventoryBatchId || ""}`;
        const existing = oldMap.get(key);
        if (existing) {
          existing.qty += Number(item.quantityUsed || 0);
        } else {
          oldMap.set(key, {
            itemId: item.inventoryItemId,
            batchId: item.inventoryBatchId || null,
            qty: Number(item.quantityUsed || 0),
            unit: item.unit,
          });
        }
      }

      const newMap = new Map<string, { itemId: string; batchId: string | null; qty: number; unit: string }>();
      for (const item of updates.items) {
        if (!item.inventoryItemId) throw new Error("Item sem ID de estoque.");
        const qty = Number(item.quantityUsed || 0);
        if (!Number.isFinite(qty) || qty <= 0) throw new Error("Quantidade invalida para um dos itens.");
        const key = `${item.inventoryItemId}|${item.inventoryBatchId || ""}`;
        const existing = newMap.get(key);
        if (existing) {
          existing.qty += qty;
        } else {
          newMap.set(key, {
            itemId: item.inventoryItemId,
            batchId: item.inventoryBatchId || null,
            qty,
            unit: item.unit || "un",
          });
        }
      }

      const allKeys = new Set([...oldMap.keys(), ...newMap.keys()]);

      for (const key of allKeys) {
        const oldData = oldMap.get(key) || { itemId: "", batchId: null, qty: 0, unit: "un" };
        const newData = newMap.get(key) || { itemId: "", batchId: null, qty: 0, unit: "un" };
        const itemId = oldData.itemId || newData.itemId;
        const batchId = oldData.batchId || newData.batchId;
        const unit = oldData.unit || newData.unit;
        const delta = newData.qty - oldData.qty;

        if (delta === 0) continue;

        const inventoryItem = await inventoryRepository.findItemById(itemId);
        if (!inventoryItem) throw new Error(`Item nao encontrado: ${itemId}`);

        if (delta > 0) {
          if (Number(inventoryItem.requires_batch) === 1 && !batchId) {
            throw new Error(`Selecione um lote para ${inventoryItem.name}.`);
          }
          if (inventoryItem.current_stock < delta) {
            throw new Error(`Estoque insuficiente para a correcao de ${inventoryItem.name}. Precisa de mais ${delta}.`);
          }

          if (batchId) {
            const batches = await proceduresRepository.listBatchesForItem(itemId);
            const batch = batches.find(candidate => candidate.id === batchId);
            if (!batch) throw new Error("Lote nao encontrado.");
            if (batch.currentQuantity < delta) {
              throw new Error(`Saldo insuficiente no lote de ${inventoryItem.name}. Precisa de mais ${delta}.`);
            }
            await batchRepository.updateQuantity(batchId, -delta);
          }

          const locationId = await locationsRepository.findLocationWithStock(itemId, batchId, delta);
          await inventoryRepository.incrementCurrentStock(itemId, -delta);
          if (locationId) {
            await locationsRepository.removeStockFromLocation(locationId, itemId, batchId, delta);
          }

          await dbExecute(`
            INSERT INTO stock_movements (
              id, clinic_id, inventory_item_id, inventory_batch_id, movement_type,
              quantity, unit, reason, patient_id, protocol_id, procedure_id, user_id,
              correction_group_id, location_id
            )
            VALUES (?, 'ana-morong-clinic', ?, ?, 'correction_out', ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            crypto.randomUUID(),
            itemId,
            batchId,
            delta,
            unit,
            `Correcao OUT - Motivo: ${reason}`,
            oldProcedure.patientId,
            oldProcedure.protocolId || null,
            procedureId,
            userId,
            correctionGroupId,
            locationId,
          ]);
        } else {
          const absDelta = Math.abs(delta);
          if (batchId) {
            await batchRepository.updateQuantity(batchId, absDelta);
          }

          const locationId = await locationsRepository.getDefaultLocationId();
          await inventoryRepository.incrementCurrentStock(itemId, absDelta);
          await locationsRepository.addStockToLocation(locationId, itemId, batchId, absDelta);

          await dbExecute(`
            INSERT INTO stock_movements (
              id, clinic_id, inventory_item_id, inventory_batch_id, movement_type,
              quantity, unit, reason, patient_id, protocol_id, procedure_id, user_id,
              correction_group_id, location_id
            )
            VALUES (?, 'ana-morong-clinic', ?, ?, 'correction_in', ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            crypto.randomUUID(),
            itemId,
            batchId,
            absDelta,
            unit,
            `Correcao IN (Estorno) - Motivo: ${reason}`,
            oldProcedure.patientId,
            oldProcedure.protocolId || null,
            procedureId,
            userId,
            correctionGroupId,
            locationId,
          ]);
        }
      }

      await dbExecute(`
        UPDATE procedure_items_used
        SET is_corrected = 1, corrected_at = ?, correction_group_id = ?
        WHERE procedure_id = ? AND is_corrected = 0
      `, [now, correctionGroupId, procedureId]);

      for (const newItem of updates.items) {
        await proceduresRepository.createItem({
          ...newItem,
          procedureId,
        });
      }

      let newEvolution = oldProcedure.evolutionText;
      if (regenerateEvolution) {
        const [patient] = await dbSelect<any>(`SELECT full_name FROM patients WHERE id = ?`, [oldProcedure.patientId]);

        let protocol = null;
        let route = null;
        let area = null;

        if (oldProcedure.protocolId) {
          const protocols = await dbSelect<any>(`SELECT name, administration_route_id FROM protocols WHERE id = ?`, [oldProcedure.protocolId]);
          protocol = protocols[0];
          if (protocol?.administration_route_id) {
            const routes = await dbSelect<any>(`SELECT name FROM administration_routes WHERE id = ?`, [protocol.administration_route_id]);
            route = routes[0];
          }
        }

        if (updates.bodyAreaId) {
          const areas = await dbSelect<any>(`SELECT name, side, display_name FROM body_areas WHERE id = ?`, [updates.bodyAreaId]);
          area = areas[0];
        }

        const enrichedItems = [];
        for (const item of updates.items) {
          const [itemData] = await dbSelect<any>(`SELECT name, item_type FROM inventory_items WHERE id = ?`, [item.inventoryItemId]);
          let batchData = null;
          if (item.inventoryBatchId) {
            const rows = await dbSelect<any>(`SELECT batch_number, expiration_date FROM inventory_batches WHERE id = ?`, [item.inventoryBatchId]);
            batchData = rows[0];
          }

          enrichedItems.push({
            itemType: itemData?.item_type || "other",
            itemName: itemData?.name || "Desconhecido",
            quantityUsed: Number(item.quantityUsed || 0),
            unit: item.unit || "un",
            batchNumber: batchData?.batch_number,
            expirationDate: batchData?.expiration_date,
          });
        }

        newEvolution = evolutionService.generateProcedureEvolution({
          patientName: patient?.full_name || "Paciente",
          protocolName: protocol?.name,
          routeName: route?.name,
          bodyAreaName: area?.display_name || area?.name,
          bodyAreaSide: area?.side,
          hadIntercurrence: updates.intercurrence,
          intercurrenceDescription: updates.intercurrenceDescription,
          notes: updates.notes,
          items: enrichedItems,
        });
      }

      await dbExecute(`
        UPDATE procedures SET
          body_area_id = COALESCE(?, body_area_id),
          had_intercurrence = ?,
          intercurrence_description = ?,
          notes = ?,
          evolution_text = ?,
          is_corrected = 1,
          corrected_at = ?,
          correction_reason = ?
        WHERE id = ?
      `, [
        updates.bodyAreaId || null,
        updates.intercurrence ? 1 : 0,
        updates.intercurrenceDescription || null,
        updates.notes || null,
        newEvolution || null,
        now,
        reason,
        procedureId,
      ]);

      await auditService.log({
        action: "procedure_corrected",
        entity_type: "procedure",
        entity_id: procedureId,
        description: `Procedimento corrigido. Motivo: ${reason}`,
        before_data: { oldProcedure, oldItems },
        after_data: { updates, correctionGroupId },
      });
    });
  },
};
