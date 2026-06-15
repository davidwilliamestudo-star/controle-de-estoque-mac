import { auditService } from "@/features/audit/services/audit.service";
import { getStoredAuthSession } from "@/features/auth/session";
import { labelsRepository } from "../repositories/labels.repository";
import type { LabelPrintJobDetails, LabelTemplate } from "@/features/inventory/types";

export interface InventoryLabelBatchOption {
  id: string;
  batchNumber: string;
  expirationDate: string | null;
  currentQuantity: number;
  supplierName: string | null;
}

export interface InventoryLabelItemOption {
  id: string;
  name: string;
  itemType: string;
  unit: string;
  currentStock: number;
  batches: InventoryLabelBatchOption[];
}

export interface ResolvedBatchQr {
  batch_id: string;
  batch_number: string;
  expiration_date: string | null;
  current_quantity: number;
  item_id: string;
  item_name: string;
  unit: string;
  supplier_name: string | null;
}

export const LABEL_QR_PREFIX = "CESTQ:BATCH:";

export function buildBatchQrPayload(batchId: string): string {
  return `${LABEL_QR_PREFIX}${batchId}`;
}

export function parseBatchQrPayload(payload: string): string {
  const normalized = payload.trim();
  if (!normalized.startsWith(LABEL_QR_PREFIX)) {
    throw new Error("QR Code invalido. O formato esperado e CESTQ:BATCH:{id_do_lote}.");
  }

  const batchId = normalized.slice(LABEL_QR_PREFIX.length).trim();
  if (!batchId) {
    throw new Error("QR Code invalido. ID do lote ausente.");
  }

  return batchId;
}

export const labelsService = {
  async listTemplates(): Promise<LabelTemplate[]> {
    return labelsRepository.listTemplates();
  },

  async listInventoryLabelOptions(): Promise<InventoryLabelItemOption[]> {
    const rows = await labelsRepository.listInventoryLabelOptions();
    const items = new Map<string, InventoryLabelItemOption>();

    for (const row of rows) {
      let item = items.get(row.item_id);
      if (!item) {
        item = {
          id: row.item_id,
          name: row.item_name,
          itemType: row.item_type,
          unit: row.unit,
          currentStock: Number(row.current_stock ?? 0),
          batches: [],
        };
        items.set(row.item_id, item);
      }

      item.batches.push({
        id: row.batch_id,
        batchNumber: row.batch_number,
        expirationDate: row.expiration_date,
        currentQuantity: Number(row.current_quantity ?? 0),
        supplierName: row.supplier_name,
      });
    }

    return Array.from(items.values());
  },

  async updateTemplateCalibration(id: string, x: number, y: number): Promise<void> {
    await labelsRepository.updateTemplateCalibration(id, x, y);
    await auditService.log({
      action: "label_template_calibrated",
      entity_type: "label_template",
      entity_id: id,
      description: `Template de etiqueta calibrado. Offset X: ${x}mm, Offset Y: ${y}mm.`,
      after_data: { calibration_x: x, calibration_y: y },
    });
  },

  async createBatchLabelJob(data: {
    itemId: string;
    itemName: string;
    batchId: string;
    batchNumber: string;
    expirationDate?: string | null;
    quantity: number;
    templateId: string;
  }): Promise<string> {
    const session = getStoredAuthSession();
    const jobId = crypto.randomUUID();
    const printItemId = crypto.randomUUID();
    const qrPayload = buildBatchQrPayload(data.batchId);

    await labelsRepository.createPrintJob(jobId, {
      jobName: `Etiquetas - ${data.itemName}`,
      sourceType: "inventory_batch",
      sourceId: data.batchId,
      templateId: data.templateId,
      totalLabels: data.quantity,
      userId: session?.userId ?? null,
    });

    await labelsRepository.createPrintItem(printItemId, {
      printJobId: jobId,
      inventoryItemId: data.itemId,
      inventoryBatchId: data.batchId,
      quantity: data.quantity,
      qrPayload,
      barcodeValue: data.batchId.slice(0, 12).toUpperCase(),
      labelDataSnapshot: {
        itemName: data.itemName,
        batchNumber: data.batchNumber,
        expirationDate: data.expirationDate,
        qrPayload,
      },
    });

    await auditService.log({
      action: "labels_job_created",
      entity_type: "label_print_job",
      entity_id: jobId,
      description: `Geracao de ${data.quantity} etiqueta(s) para ${data.itemName}.`,
      after_data: { batchId: data.batchId, templateId: data.templateId, qrPayload },
    });

    return jobId;
  },

  async getPrintJob(id: string): Promise<LabelPrintJobDetails | null> {
    return labelsRepository.findPrintJob(id);
  },

  async resolveBatchQr(payload: string): Promise<ResolvedBatchQr | null> {
    parseBatchQrPayload(payload);
    return labelsRepository.findBatchFromQrPayload(payload);
  },
};
