import { dbTransaction } from "@/lib/db/sqlite";
import { proceduresRepository } from "../repositories/procedures.repository";
import { inventoryRepository } from "@/features/inventory/repositories/inventory.repository";
import { batchRepository } from "@/features/inventory/repositories/batch.repository";
import { locationsRepository } from "@/features/inventory/repositories/locations.repository";
import { stockMovementRepository } from "@/features/inventory/repositories/stockMovement.repository";
import { auditService } from "@/features/audit/services/audit.service";
import { patientApplicationsRepository } from "@/features/patients/repositories/patientApplications.repository";
import type { Procedure, ProcedureItemUsed } from "../types";

export interface SaveProcedureInput {
  procedure: Partial<Procedure>;
  items: Partial<ProcedureItemUsed>[];
  userId?: string;
}

class ProceduresService {
  async listProcedures(): Promise<Procedure[]> {
    return proceduresRepository.listAll();
  }

  async getProcedureWithItems(id: string): Promise<{ procedure: Procedure; items: ProcedureItemUsed[] } | null> {
    const procedure = await proceduresRepository.findById(id);
    if (!procedure) return null;
    const items = await proceduresRepository.listItems(id);
    return { procedure, items };
  }

  async saveDraft(input: SaveProcedureInput): Promise<string> {
    return dbTransaction(async () => {
      const isNew = !input.procedure.id;
      const procedureId = input.procedure.id || crypto.randomUUID();

      if (isNew) {
        await proceduresRepository.create({ ...input.procedure, id: procedureId, status: "draft" });
      } else {
        await proceduresRepository.update(procedureId, { ...input.procedure, status: "draft" });
        await proceduresRepository.deleteItems(procedureId);
      }

      for (const item of input.items) {
        await proceduresRepository.createItem({
          ...item,
          procedureId,
        });
      }

      if (input.procedure.applicationPlanId) {
        await patientApplicationsRepository.update(input.procedure.applicationPlanId, {
          id: input.procedure.applicationPlanId,
          status: "in_progress",
        });
      }

      return procedureId;
    });
  }

  async finalizeProcedure(input: SaveProcedureInput): Promise<void> {
    return dbTransaction(async () => {
      const procedureId = input.procedure.id;
      if (!procedureId) throw new Error("ID do procedimento e obrigatorio para finalizar.");

      const existingProcedure = await proceduresRepository.findById(procedureId);
      if (!existingProcedure) throw new Error("Procedimento nao encontrado.");
      if (existingProcedure.status === "finalized") throw new Error("Procedimento ja foi finalizado.");
      if (!input.procedure.bodyAreaId && !existingProcedure.bodyAreaId) throw new Error("Selecione a area corporal antes de finalizar.");
      if (input.items.length === 0) throw new Error("Adicione pelo menos um item utilizado antes de finalizar.");

      for (const item of input.items) {
        if (!item.inventoryItemId) throw new Error("Item sem ID de estoque.");
        const inventoryItem = await inventoryRepository.findItemById(item.inventoryItemId);
        if (!inventoryItem) throw new Error(`Item de estoque nao encontrado: ${item.inventoryItemId}`);

        let quantityUsed = Number(item.quantityUsed || 0);
        quantityUsed = Math.round(quantityUsed * 10000) / 10000;
        
        if (!Number.isFinite(quantityUsed) || quantityUsed <= 0) {
          throw new Error(`Quantidade invalida para ${inventoryItem.name}.`);
        }
        if (Number(inventoryItem.requires_batch) === 1 && !item.inventoryBatchId) {
          throw new Error(`Selecione um lote para ${inventoryItem.name}.`);
        }
        if (inventoryItem.current_stock < quantityUsed) {
          throw new Error(`Estoque insuficiente para ${inventoryItem.name}. Possui: ${inventoryItem.current_stock}, necessita: ${quantityUsed}`);
        }

        if (item.inventoryBatchId) {
          const batches = await proceduresRepository.listBatchesForItem(item.inventoryItemId);
          const batch = batches.find(candidate => candidate.id === item.inventoryBatchId);
          if (!batch) throw new Error(`Lote selecionado nao encontrado para ${inventoryItem.name}.`);
          if (batch.currentQuantity < quantityUsed) {
            throw new Error(`Saldo insuficiente no lote ${batch.batchNumber} de ${inventoryItem.name}. Possui: ${batch.currentQuantity}, necessita: ${quantityUsed}`);
          }
        }
      }

      await proceduresRepository.update(procedureId, {
        ...input.procedure,
        status: "finalized",
        finalizedAt: new Date().toISOString(),
      });

      await proceduresRepository.deleteItems(procedureId);

      for (const item of input.items) {
        let quantityUsed = Number(item.quantityUsed || 0);
        quantityUsed = Math.round(quantityUsed * 10000) / 10000;
        
        const locationId = await locationsRepository.findLocationWithStock(
          item.inventoryItemId!,
          item.inventoryBatchId ?? null,
          quantityUsed
        );

        await proceduresRepository.createItem({
          ...item,
          procedureId,
        });

        if (item.inventoryBatchId) {
          await batchRepository.updateQuantity(item.inventoryBatchId, -quantityUsed);
        }

        await inventoryRepository.incrementCurrentStock(item.inventoryItemId!, -quantityUsed);
        if (locationId) {
          await locationsRepository.removeStockFromLocation(locationId, item.inventoryItemId!, item.inventoryBatchId ?? null, quantityUsed);
        }

        await stockMovementRepository.createExit(crypto.randomUUID(), {
          inventoryItemId: item.inventoryItemId!,
          inventoryBatchId: item.inventoryBatchId,
          quantity: quantityUsed,
          unit: item.unit || "un",
          reason: "Aplicacao / Atendimento",
          userId: input.userId,
          patientId: existingProcedure.patientId,
          protocolId: existingProcedure.protocolId,
          procedureId,
          locationId,
        });
      }

      await auditService.log({
        action: "procedure_finalized",
        entity_type: "procedure",
        entity_id: procedureId,
        description: "Procedimento finalizado para o paciente.",
        after_data: input,
      });

      if (existingProcedure.applicationPlanId) {
        await patientApplicationsRepository.update(existingProcedure.applicationPlanId, {
          id: existingProcedure.applicationPlanId,
          status: "finalized",
        });
      }

      if (existingProcedure.appointmentId) {
        await import("@/features/agenda/repositories/appointments.repository").then(m =>
          m.appointmentsRepository.update(existingProcedure.appointmentId!, {
            status: "done",
          })
        );
      }
    });
  }

  async generateEvolutionText(procedureId: string, templateText: string, contextData: any): Promise<string> {
    let text = templateText;
    text = text.replace(/{{patient_name}}/g, contextData.patientName || "");
    text = text.replace(/{{procedure_date}}/g, new Date().toLocaleDateString("pt-BR"));
    text = text.replace(/{{protocol_name}}/g, contextData.protocolName || "");
    text = text.replace(/{{body_area}}/g, contextData.bodyAreaName || "Nao informada");

    const meds = contextData.items
      .filter((i: any) => i.itemType === "medication")
      .map((i: any) => `- ${i.itemName} (${i.quantityUsed} ${i.unit}) Lote: ${i.batchNumberSnapshot || "N/A"}`)
      .join("\n");
    text = text.replace(/{{medications}}/g, meds || "Nenhum medicamento");

    const mats = contextData.items
      .filter((i: any) => i.itemType === "material")
      .map((i: any) => `- ${i.itemName} (${i.quantityUsed} ${i.unit})`)
      .join("\n");
    text = text.replace(/{{materials}}/g, mats || "Nenhum material");

    text = text.replace(/{{intercurrence_status}}/g, contextData.hadIntercurrence ? "COM intercorrencia" : "SEM intercorrencias");
    text = text.replace(/{{intercurrence_description}}/g, contextData.intercurrenceDescription || "Nenhuma");
    text = text.replace(/{{notes}}/g, contextData.notes || "Sem observacoes adicionais");

    return text;
  }
}

export const proceduresService = new ProceduresService();
