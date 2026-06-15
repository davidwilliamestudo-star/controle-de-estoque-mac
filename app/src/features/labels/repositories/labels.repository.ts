import { dbExecute, dbSelect } from "@/lib/db/sqlite";
import { CLINIC_ID, type LabelPrintJobDetails, type LabelPrintItem, type LabelTemplate } from "@/features/inventory/types";

export interface InventoryLabelOptionRow {
  item_id: string;
  item_name: string;
  item_type: string;
  unit: string;
  current_stock: number;
  batch_id: string;
  batch_number: string;
  expiration_date: string | null;
  current_quantity: number;
  supplier_name: string | null;
}

export const labelsRepository = {
  async listTemplates(): Promise<LabelTemplate[]> {
    return dbSelect<LabelTemplate>(`
      SELECT *
      FROM label_templates
      WHERE clinic_id = ? AND deleted_at IS NULL
      ORDER BY is_default DESC, name ASC
    `, [CLINIC_ID]);
  },

  async listInventoryLabelOptions(): Promise<InventoryLabelOptionRow[]> {
    return dbSelect<InventoryLabelOptionRow>(`
      SELECT
        i.id AS item_id,
        i.name AS item_name,
        i.item_type,
        i.unit,
        i.current_stock,
        b.id AS batch_id,
        b.batch_number,
        b.expiration_date,
        b.current_quantity,
        s.name AS supplier_name
      FROM inventory_items i
      JOIN inventory_batches b
        ON b.inventory_item_id = i.id
       AND b.clinic_id = i.clinic_id
       AND b.deleted_at IS NULL
       AND b.current_quantity > 0
      LEFT JOIN suppliers s ON s.id = b.supplier_id
      WHERE i.clinic_id = ?
        AND i.deleted_at IS NULL
        AND i.is_active = 1
      ORDER BY
        i.name ASC,
        CASE WHEN b.expiration_date IS NULL THEN 1 ELSE 0 END ASC,
        b.expiration_date ASC,
        b.batch_number ASC
    `, [CLINIC_ID]);
  },

  async updateTemplateCalibration(id: string, x: number, y: number): Promise<void> {
    await dbExecute(`
      UPDATE label_templates
      SET calibration_x = ?, calibration_y = ?, updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ?
    `, [x, y, id, CLINIC_ID]);
  },

  async createPrintJob(id: string, data: {
    jobName: string;
    sourceType: string;
    sourceId: string;
    templateId: string;
    totalLabels: number;
    userId?: string | null;
  }): Promise<void> {
    await dbExecute(`
      INSERT INTO label_print_jobs (
        id, clinic_id, job_name, source_type, source_id, template_id, total_labels, status, created_by_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'created', ?)
    `, [
      id,
      CLINIC_ID,
      data.jobName,
      data.sourceType,
      data.sourceId,
      data.templateId,
      data.totalLabels,
      data.userId ?? null,
    ]);
  },

  async createPrintItem(id: string, data: {
    printJobId: string;
    inventoryItemId: string;
    inventoryBatchId: string;
    quantity: number;
    qrPayload: string;
    barcodeValue?: string | null;
    labelDataSnapshot: unknown;
  }): Promise<void> {
    await dbExecute(`
      INSERT INTO label_print_items (
        id, clinic_id, print_job_id, inventory_item_id, inventory_batch_id,
        quantity, qr_payload, barcode_value, label_data_snapshot
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      CLINIC_ID,
      data.printJobId,
      data.inventoryItemId,
      data.inventoryBatchId,
      data.quantity,
      data.qrPayload,
      data.barcodeValue ?? null,
      JSON.stringify(data.labelDataSnapshot),
    ]);
  },

  async findPrintJob(id: string): Promise<LabelPrintJobDetails | null> {
    const jobs = await dbSelect<{
      id: string;
      job_name: string;
      total_labels: number;
      status: string;
      template_id: string;
    }>(`
      SELECT id, job_name, total_labels, status, template_id
      FROM label_print_jobs
      WHERE id = ? AND clinic_id = ?
      LIMIT 1
    `, [id, CLINIC_ID]);

    const job = jobs[0];
    if (!job) return null;

    const templates = await dbSelect<LabelTemplate>(`
      SELECT *
      FROM label_templates
      WHERE id = ? AND clinic_id = ?
      LIMIT 1
    `, [job.template_id, CLINIC_ID]);

    const items = await dbSelect<LabelPrintItem>(`
      SELECT
        lpi.id,
        lpi.inventory_batch_id,
        lpi.quantity,
        lpi.qr_payload,
        lpi.barcode_value,
        ii.name AS item_name,
        ib.batch_number,
        ib.expiration_date,
        ii.unit,
        ib.initial_quantity AS total_quantity,
        s.name AS supplier_name
      FROM label_print_items lpi
      JOIN inventory_items ii ON ii.id = lpi.inventory_item_id
      JOIN inventory_batches ib ON ib.id = lpi.inventory_batch_id
      LEFT JOIN suppliers s ON s.id = ib.supplier_id
      WHERE lpi.print_job_id = ? AND lpi.clinic_id = ?
      ORDER BY lpi.created_at ASC
    `, [id, CLINIC_ID]);

    return {
      id: job.id,
      job_name: job.job_name,
      total_labels: job.total_labels,
      status: job.status,
      template: templates[0],
      items,
    };
  },

  async findBatchFromQrPayload(payload: string): Promise<{
    batch_id: string;
    batch_number: string;
    expiration_date: string | null;
    current_quantity: number;
    item_id: string;
    item_name: string;
    unit: string;
    supplier_name: string | null;
  } | null> {
    const batchId = payload.startsWith("CESTQ:BATCH:")
      ? payload.replace("CESTQ:BATCH:", "").trim()
      : payload.trim();

    if (!batchId) return null;

    const rows = await dbSelect<{
      batch_id: string;
      batch_number: string;
      expiration_date: string | null;
      current_quantity: number;
      item_id: string;
      item_name: string;
      unit: string;
      supplier_name: string | null;
    }>(`
      SELECT
        b.id AS batch_id,
        b.batch_number,
        b.expiration_date,
        b.current_quantity,
        i.id AS item_id,
        i.name AS item_name,
        i.unit,
        s.name AS supplier_name
      FROM inventory_batches b
      JOIN inventory_items i ON i.id = b.inventory_item_id
      LEFT JOIN suppliers s ON s.id = b.supplier_id
      WHERE b.id = ? AND b.clinic_id = ?
      LIMIT 1
    `, [batchId, CLINIC_ID]);

    return rows[0] ?? null;
  },
};
