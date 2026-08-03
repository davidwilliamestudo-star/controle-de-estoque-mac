import { dbTransaction } from "@/lib/db/sqlite";
import { proceduresRepository } from "../repositories/procedures.repository";
import { inventoryRepository } from "@/features/inventory/repositories/inventory.repository";
import { batchRepository } from "@/features/inventory/repositories/batch.repository";
import { locationsRepository } from "@/features/inventory/repositories/locations.repository";
import { stockMovementRepository } from "@/features/inventory/repositories/stockMovement.repository";
import { auditService } from "@/features/audit/services/audit.service";
import { patientApplicationsRepository } from "@/features/patients/repositories/patientApplications.repository";
import { financialService } from "@/features/financial/services/financial.service";
import { financialRepository } from "@/features/financial/repositories/financial.repository";
import type { Procedure, ProcedureApplication, ProcedureItemUsed } from "../types";

export interface SaveProcedureInput {
  procedure: Partial<Procedure>;
  /** Nova estrutura: múltiplas aplicações (protocolo + área + itens) */
  applications?: ProcedureApplication[];
  /** Legado: lista plana de itens (rascunhos sem aplicação) */
  items?: Partial<ProcedureItemUsed>[];
  userId?: string;
  chargedAmount?: number;
  paymentMethodId?: string | null;
}

/** Achata as aplicações em uma lista plana de itens com applicationId */
function flattenApplicationItems(applications: ProcedureApplication[], procedureId: string): Array<{ item: Partial<ProcedureItemUsed>; applicationId: string | null }> {
  const result: Array<{ item: Partial<ProcedureItemUsed>; applicationId: string | null }> = [];
  for (const app of applications) {
    const applicationId = app.id || null;
    for (const item of app.items) {
      result.push({ item, applicationId });
    }
  }
  return result;
}

class ProceduresService {
  async listProcedures(): Promise<Procedure[]> {
    return proceduresRepository.listAll();
  }

  async getProcedureWithItems(id: string): Promise<{ procedure: Procedure; items: ProcedureItemUsed[]; applications: any[] } | null> {
    const procedure = await proceduresRepository.findById(id);
    if (!procedure) return null;
    const items = await proceduresRepository.listItems(id);
    const applications = await proceduresRepository.listApplicationsForProcedure(id);
    return { procedure, items, applications };
  }

  async saveDraft(input: SaveProcedureInput): Promise<string> {
    return dbTransaction(async () => {
      const isNew = !input.procedure.id;
      const procedureId = input.procedure.id || crypto.randomUUID();

      // Determina protocol_id e body_area_id da procedures a partir da primeira aplicação
      const firstApp = input.applications?.[0];
      const procedureData = {
        ...input.procedure,
        id: procedureId,
        status: "draft" as const,
        protocolId: firstApp?.protocolId ?? input.procedure.protocolId ?? null,
        bodyAreaId: firstApp?.bodyAreaId ?? input.procedure.bodyAreaId ?? null,
      };

      if (isNew) {
        await proceduresRepository.create(procedureData);
      } else {
        await proceduresRepository.update(procedureId, procedureData);
        // Items first — FK: procedure_items_used.procedure_application_id → procedure_applications
        await proceduresRepository.deleteItems(procedureId);
        await proceduresRepository.deleteApplications(procedureId);
      }

      if (input.applications && input.applications.length > 0) {
        // Salvar novas aplicações estruturadas
        for (let i = 0; i < input.applications.length; i++) {
          const app = input.applications[i];
          const appId = app.id || crypto.randomUUID();
          app.id = appId; // persist for item linking

          await proceduresRepository.createApplication({
            id: appId,
            procedureId,
            protocolId: app.protocolId,
            bodyAreaId: app.bodyAreaId,
            sortOrder: i,
            notes: app.notes,
          });

          for (const item of app.items) {
            await proceduresRepository.createItem({
              ...item,
              procedureId,
              procedureApplicationId: appId,
            });
          }
        }
      } else if (input.items && input.items.length > 0) {
        // Legado: salvar itens sem aplicação estruturada
        for (const item of input.items) {
          await proceduresRepository.createItem({ ...item, procedureId });
        }
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

      // Coletar todos os itens de todas as aplicações
      const allItems: Array<{ item: Partial<ProcedureItemUsed>; applicationId: string | null }> = [];

      if (input.applications && input.applications.length > 0) {
        const hasAnyArea = input.applications.some(a => a.bodyAreaId);
        if (!hasAnyArea && !existingProcedure.bodyAreaId) {
          throw new Error("Selecione a area corporal em pelo menos uma aplicacao antes de finalizar.");
        }
        allItems.push(...flattenApplicationItems(input.applications, procedureId));
      } else if (input.items && input.items.length > 0) {
        // Fallback legado
        if (!input.procedure.bodyAreaId && !existingProcedure.bodyAreaId) {
          throw new Error("Selecione a area corporal antes de finalizar.");
        }
        for (const item of input.items) {
          allItems.push({ item, applicationId: null });
        }
      }

      if (allItems.length === 0) throw new Error("Adicione pelo menos um item utilizado antes de finalizar.");

      // Validações de estoque
      for (const { item } of allItems) {
        if (!item.inventoryItemId) throw new Error("Item sem ID de estoque.");
        const inventoryItem = await inventoryRepository.findItemById(item.inventoryItemId);
        if (!inventoryItem) throw new Error(`Item de estoque nao encontrado: ${item.inventoryItemId}`);

        let quantityUsed = Math.round(Number(item.quantityUsed || 0) * 10000) / 10000;
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
          const batch = batches.find(b => b.id === item.inventoryBatchId);
          if (!batch) throw new Error(`Lote selecionado nao encontrado para ${inventoryItem.name}.`);
          if (batch.currentQuantity < quantityUsed) {
            throw new Error(`Saldo insuficiente no lote ${batch.batchNumber} de ${inventoryItem.name}. Possui: ${batch.currentQuantity}, necessita: ${quantityUsed}`);
          }
        }
      }

      // Determina protocol_id e body_area_id principal (primeira aplicação)
      const firstApp = input.applications?.[0];
      await proceduresRepository.update(procedureId, {
        ...input.procedure,
        protocolId: firstApp?.protocolId ?? input.procedure.protocolId ?? existingProcedure.protocolId ?? null,
        bodyAreaId: firstApp?.bodyAreaId ?? input.procedure.bodyAreaId ?? existingProcedure.bodyAreaId ?? null,
        status: "finalized",
        finalizedAt: new Date().toISOString(),
      });

      // Recriar aplicações e itens — Items primeiro (FK constraint)
      await proceduresRepository.deleteItems(procedureId);
      await proceduresRepository.deleteApplications(procedureId);

      if (input.applications && input.applications.length > 0) {
        for (let i = 0; i < input.applications.length; i++) {
          const app = input.applications[i];
          // Sempre novos UUIDs — evita UNIQUE conflict com rascunho anterior
          const appId = crypto.randomUUID();
          app.id = appId;

          await proceduresRepository.createApplication({
            id: appId,
            procedureId,
            protocolId: app.protocolId,
            bodyAreaId: app.bodyAreaId,
            sortOrder: i,
            notes: app.notes,
          });

          for (const item of app.items) {
            await proceduresRepository.createItem({
              ...item,
              id: undefined, // novo UUID gerado pelo createItem
              procedureId,
              procedureApplicationId: appId,
            });
          }
        }
      } else if (input.items && input.items.length > 0) {
        // Legado: salvar itens sem aplicação estruturada
        for (const item of input.items) {
          await proceduresRepository.createItem({ 
            ...item, 
            id: undefined,
            procedureId,
            procedureApplicationId: null,
          });
        }
      }

      // Baixa de estoque para todos os itens
      for (const { item } of allItems) {
        let quantityUsed = Math.round(Number(item.quantityUsed || 0) * 10000) / 10000;

        const locationId = await locationsRepository.findLocationWithStock(
          item.inventoryItemId!,
          item.inventoryBatchId ?? null,
          quantityUsed
        );

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
          // Medicamentos são sempre baixados em ml; materiais mantêm a unidade cadastrada
          unit: (!item.itemType || item.itemType === "medication") ? "ml" : (item.unit || "un"),
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
        after_data: { applicationsCount: input.applications?.length ?? 0, itemsCount: allItems.length },
      });

      if (existingProcedure.applicationPlanId) {
        await patientApplicationsRepository.update(existingProcedure.applicationPlanId, {
          id: existingProcedure.applicationPlanId,
          status: "finalized",
        });
      }

      if (existingProcedure.appointmentId) {
        await import("@/features/agenda/repositories/appointments.repository").then(m =>
          m.appointmentsRepository.update(existingProcedure.appointmentId!, { status: "done" })
        );
      }

      // Lançamento financeiro: prioriza chargedAmount; senão totalAmount do checkout
      const chargedAmount = Number(
        input.chargedAmount ??
        input.procedure.totalAmount ??
        existingProcedure.totalAmount ??
        0,
      );
      const paymentStatus =
        (input.procedure as any).paymentStatus ??
        existingProcedure.paymentStatus ??
        "pending";
      const rawPaymentMethod =
        input.paymentMethodId ??
        (input.procedure as any).paymentMethod ??
        existingProcedure.paymentMethod ??
        null;

      // Mapeia slug do checkout (pix, credit_card...) para ID de financial_payment_methods
      const paymentMethodMap: Record<string, string> = {
        pix: "fin-pay-pix",
        credit_card: "fin-pay-credit-card",
        credit: "fin-pay-credit-card",
        debit_card: "fin-pay-debit-card",
        debit: "fin-pay-debit-card",
        money: "fin-pay-cash",
        cash: "fin-pay-cash",
        bank_transfer: "fin-pay-transfer",
        transfer: "fin-pay-transfer",
        bank_slip: "fin-pay-bank-slip",
      };
      const paymentMethodId =
        rawPaymentMethod && paymentMethodMap[String(rawPaymentMethod)]
          ? paymentMethodMap[String(rawPaymentMethod)]
          : rawPaymentMethod && String(rawPaymentMethod).startsWith("fin-pay-")
            ? String(rawPaymentMethod)
            : null;

      if (chargedAmount > 0) {
        await financialService.createReceivableForProcedure({
          procedureId,
          patientId: existingProcedure.patientId,
          protocolId:
            firstApp?.protocolId ??
            input.procedure.protocolId ??
            existingProcedure.protocolId ??
            null,
          description: `Receita de procedimento — ${new Date().toLocaleDateString("pt-BR")}`,
          amount: chargedAmount,
          dueDate: new Date().toISOString().split("T")[0],
          paymentMethodId,
          markAsPaid: paymentStatus === "paid",
        });
      }
    });
  }

  /**
   * Cancela um procedimento já finalizado.
   * Estorna toda a baixa de estoque e cancela a Conta a Receber vinculada.
   * ATENÇÃO: Não é possível cancelar se a Conta a Receber já tiver pagamento registrado.
   */
  async cancelFinalized(procedureId: string, reason: string, userId?: string): Promise<void> {
    if (!reason?.trim()) {
      throw new Error("Informe o motivo do cancelamento do procedimento.");
    }

    // Leituras ANTES da transação (SELECTs devem preceder dbExecute dentro da tx)
    const procedure = await proceduresRepository.findById(procedureId);
    if (!procedure) throw new Error("Procedimento não encontrado.");
    if (procedure.status !== "finalized") {
      throw new Error("Apenas procedimentos finalizados podem ser cancelados.");
    }

    const items = await proceduresRepository.listItems(procedureId);

    // Verificar se a conta a receber vinculada já tem pagamento — se sim, bloquear
    const receivable = await financialRepository.findReceivableByProcedureId(procedureId);
    if (receivable && Number(receivable.paid_amount || 0) > 0) {
      throw new Error(
        "Não é possível cancelar: a Conta a Receber deste procedimento já possui pagamento registrado. Estorne o pagamento primeiro."
      );
    }

    return dbTransaction(async () => {
      // 1. Estornar baixa de estoque para cada item utilizado
      for (const item of items) {
        if (item.isCorrected) continue; // Pular itens já corrigidos

        const quantityUsed = Math.round(Number(item.quantityUsed || 0) * 10000) / 10000;
        if (quantityUsed <= 0) continue;

        // Devolver ao saldo geral do item
        await inventoryRepository.incrementCurrentStock(item.inventoryItemId, quantityUsed);

        // Devolver ao lote específico, se havia lote vinculado
        if (item.inventoryBatchId) {
          await batchRepository.updateQuantity(item.inventoryBatchId, quantityUsed);
        }

        // Registrar movimento de estorno para rastreabilidade
        await stockMovementRepository.createReversal(crypto.randomUUID(), {
          inventoryItemId: item.inventoryItemId,
          inventoryBatchId: item.inventoryBatchId ?? null,
          quantity: quantityUsed,
          unit: item.unit || "un",
          reason: `Estorno de procedimento cancelado — ${reason.trim()}`,
          userId: userId ?? null,
          procedureId,
          notes: `Lote: ${item.batchNumberSnapshot || "S/L"} | Cancelado em ${new Date().toLocaleDateString("pt-BR")}`,
        });
      }

      // 2. Cancelar Conta a Receber vinculada (se existir e não estiver paga)
      if (receivable && receivable.status !== "cancelled") {
        await financialRepository.cancelReceivable(receivable.id);
      }

      // 3. Marcar procedimento como cancelado
      await proceduresRepository.update(procedureId, {
        status: "cancelled" as any,
        notes: procedure.notes
          ? `${procedure.notes}\n[CANCELADO em ${new Date().toLocaleDateString("pt-BR")}]: ${reason.trim()}`
          : `[CANCELADO em ${new Date().toLocaleDateString("pt-BR")}]: ${reason.trim()}`,
      });

      await auditService.log({
        action: "procedure_cancelled",
        entity_type: "procedure",
        entity_id: procedureId,
        description: `Procedimento finalizado cancelado. Estoque de ${items.length} item(ns) estornado(s).`,
        before_data: { status: "finalized" },
        after_data: {
          status: "cancelled",
          reason: reason.trim(),
          itemsReversed: items.filter(i => !i.isCorrected).length,
          receivableCancelled: !!receivable,
        },
      });
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
