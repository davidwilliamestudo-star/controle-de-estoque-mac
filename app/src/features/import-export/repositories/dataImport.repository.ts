import { dbExecute, dbSelect, dbTransaction } from "@/lib/db/sqlite";
import type { DataImportJob, DataImportRow, ImportApplyResult, ImportJobStatus, ImportType } from "../types/importExport.types";

const CLINIC_ID = "ana-morong-clinic";

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapJob(row: any): DataImportJob {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    importType: row.import_type,
    fileName: row.file_name,
    fileHash: row.file_hash,
    status: row.status,
    totalRows: Number(row.total_rows ?? 0),
    validRows: Number(row.valid_rows ?? 0),
    invalidRows: Number(row.invalid_rows ?? 0),
    duplicatedRows: Number(row.duplicated_rows ?? 0),
    createdCount: Number(row.created_count ?? 0),
    updatedCount: Number(row.updated_count ?? 0),
    skippedCount: Number(row.skipped_count ?? 0),
    mergedCount: Number(row.merged_count ?? 0),
    errorCount: Number(row.error_count ?? 0),
    mappingJson: parseJson(row.mapping_json, null),
    summaryJson: parseJson(row.summary_json, null),
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function mapRow(row: any): DataImportRow {
  return {
    id: row.id,
    importJobId: row.import_job_id,
    rowNumber: Number(row.row_number),
    rawJson: parseJson(row.raw_json, {}),
    mappedJson: parseJson(row.mapped_json, {}),
    validationErrorsJson: parseJson(row.validation_errors_json, []),
    duplicateCandidatesJson: parseJson(row.duplicate_candidates_json, []),
    selectedAction: row.selected_action,
    status: row.status,
    targetEntityId: row.target_entity_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const dataImportRepository = {
  async createJob(input: {
    importType: ImportType;
    fileName: string;
    fileHash: string;
    mapping: Record<string, string>;
    rows: DataImportRow[];
    summary: unknown;
    userId?: string | null;
  }): Promise<string> {
    const jobId = crypto.randomUUID();
    const validRows = input.rows.filter(row => row.status === "valid" || row.status === "duplicate").length;
    const invalidRows = input.rows.filter(row => row.status === "invalid").length;
    const duplicatedRows = input.rows.filter(row => row.duplicateCandidatesJson.length > 0).length;

    await dbTransaction(async () => {
      await dbExecute(
        `
          INSERT INTO data_import_jobs (
            id, clinic_id, import_type, file_name, file_hash, status,
            total_rows, valid_rows, invalid_rows, duplicated_rows, mapping_json, summary_json,
            created_by_user_id
          )
          VALUES (?, ?, ?, ?, ?, 'validated', ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          jobId,
          CLINIC_ID,
          input.importType,
          input.fileName,
          input.fileHash,
          input.rows.length,
          validRows,
          invalidRows,
          duplicatedRows,
          JSON.stringify(input.mapping),
          JSON.stringify(input.summary),
          input.userId ?? null,
        ]
      );

      for (const row of input.rows) {
        await dbExecute(
          `
            INSERT INTO data_import_rows (
              id, import_job_id, row_number, raw_json, mapped_json,
              validation_errors_json, duplicate_candidates_json, selected_action,
              status, target_entity_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            row.id,
            jobId,
            row.rowNumber,
            JSON.stringify(row.rawJson),
            JSON.stringify(row.mappedJson),
            JSON.stringify(row.validationErrorsJson),
            JSON.stringify(row.duplicateCandidatesJson),
            row.selectedAction,
            row.status,
            row.targetEntityId,
          ]
        );
      }
    });

    return jobId;
  },

  async listJobs(limit = 20): Promise<DataImportJob[]> {
    const rows = await dbSelect<any>(
      `
        SELECT *
        FROM data_import_jobs
        WHERE clinic_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `,
      [CLINIC_ID, limit]
    );
    return rows.map(mapJob);
  },

  async listRows(jobId: string): Promise<DataImportRow[]> {
    const rows = await dbSelect<any>(
      `
        SELECT *
        FROM data_import_rows
        WHERE import_job_id = ?
        ORDER BY row_number ASC
      `,
      [jobId]
    );
    return rows.map(mapRow);
  },

  async updateRowAction(rowId: string, action: string, targetEntityId?: string | null): Promise<void> {
    await dbExecute(
      `
        UPDATE data_import_rows
        SET selected_action = ?, target_entity_id = COALESCE(?, target_entity_id), updated_at = datetime('now')
        WHERE id = ?
      `,
      [action, targetEntityId ?? null, rowId]
    );
  },

  async updateJobStatus(jobId: string, status: ImportJobStatus): Promise<void> {
    await dbExecute(
      `
        UPDATE data_import_jobs
        SET status = ?
        WHERE id = ?
      `,
      [status, jobId]
    );
  },

  async listPatientsForDuplicateDetection(): Promise<Record<string, unknown>[]> {
    return dbSelect(
      `
        SELECT id, full_name, phone, email, document, birth_date, notes, is_active
        FROM patients
        WHERE clinic_id = ? AND deleted_at IS NULL AND COALESCE(merge_status, 'active') != 'merged'
      `,
      [CLINIC_ID]
    );
  },

  async findPatientById(id: string): Promise<Record<string, unknown> | null> {
    const rows = await dbSelect<Record<string, unknown>>(
      `SELECT * FROM patients WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL LIMIT 1`,
      [id, CLINIC_ID]
    );
    return rows[0] ?? null;
  },

  async applyImport(input: { jobId: string; importType: ImportType; rows: DataImportRow[]; backupPath: string; userId?: string | null }): Promise<ImportApplyResult> {
    const result: ImportApplyResult = {
      jobId: input.jobId,
      backupPath: input.backupPath,
      created: 0,
      updated: 0,
      merged: 0,
      skipped: 0,
      errors: 0,
    };

    await dbTransaction(async () => {
      await dbExecute(
        `UPDATE data_import_jobs SET status = 'importing', started_at = datetime('now') WHERE id = ?`,
        [input.jobId]
      );

      for (const row of input.rows) {
        if (row.status === "invalid" || row.selectedAction === "ignore" || row.selectedAction === "manual_review") {
          result.skipped++;
          await this.markRow(row.id, "skipped");
          continue;
        }

        try {
          if (input.importType === "patients") {
            await this.applyPatientRow(row);
          } else if (input.importType === "suppliers") {
            await this.applySupplierRow(row);
          } else if (input.importType === "medications" || input.importType === "materials") {
            await this.applyInventoryItemRow(row, input.importType === "medications" ? "medication" : "material");
          } else if (input.importType === "inventory") {
            await this.applyInventoryBatchRow(row);
          } else if (input.importType === "protocols") {
            await this.applyProtocolRow(row);
          } else {
            result.skipped++;
            await this.markRow(row.id, "skipped");
            continue;
          }

          if (row.selectedAction === "create") result.created++;
          else if (row.selectedAction === "update") result.updated++;
          else if (row.selectedAction === "merge") result.merged++;
          await this.markRow(row.id, "imported", row.targetEntityId);
        } catch (error) {
          result.errors++;
          await this.markRow(row.id, "error");
          throw error;
        }
      }

      const finalStatus = result.errors > 0 ? "completed_with_errors" : "completed";
      await dbExecute(
        `
          UPDATE data_import_jobs
          SET status = ?,
              created_count = ?,
              updated_count = ?,
              merged_count = ?,
              skipped_count = ?,
              error_count = ?,
              summary_json = ?,
              completed_at = datetime('now')
          WHERE id = ?
        `,
        [
          finalStatus,
          result.created,
          result.updated,
          result.merged,
          result.skipped,
          result.errors,
          JSON.stringify(result),
          input.jobId,
        ]
      );
    });

    return result;
  },

  async markRow(rowId: string, status: string, targetEntityId?: string | null): Promise<void> {
    await dbExecute(
      `
        UPDATE data_import_rows
        SET status = ?, target_entity_id = COALESCE(?, target_entity_id), updated_at = datetime('now')
        WHERE id = ?
      `,
      [status, targetEntityId ?? null, rowId]
    );
  },

  async applyPatientRow(row: DataImportRow): Promise<void> {
    const data = row.mappedJson;
    if (row.selectedAction === "create") {
      const id = crypto.randomUUID();
      await dbExecute(
        `
          INSERT INTO patients (id, clinic_id, full_name, phone, email, document, birth_date, notes, alert_notes, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `,
        [
          id,
          CLINIC_ID,
          data.full_name,
          data.phone || null,
          data.email || null,
          data.document || null,
          data.birth_date || null,
          data.notes || null,
          data.alert_notes || null,
        ]
      );
      row.targetEntityId = id;
      return;
    }

    if ((row.selectedAction === "update" || row.selectedAction === "merge") && row.targetEntityId) {
      await dbExecute(
        `
          UPDATE patients
          SET full_name = COALESCE(NULLIF(?, ''), full_name),
              phone = COALESCE(NULLIF(?, ''), phone),
              email = COALESCE(NULLIF(?, ''), email),
              document = COALESCE(NULLIF(?, ''), document),
              birth_date = COALESCE(NULLIF(?, ''), birth_date),
              notes = COALESCE(NULLIF(?, ''), notes),
              alert_notes = COALESCE(NULLIF(?, ''), alert_notes),
              updated_at = datetime('now')
          WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL
        `,
        [
          data.full_name,
          data.phone,
          data.email,
          data.document,
          data.birth_date,
          data.notes,
          data.alert_notes,
          row.targetEntityId,
          CLINIC_ID,
        ]
      );
    }
  },

  async applySupplierRow(row: DataImportRow): Promise<void> {
    const data = row.mappedJson;
    const existing = await this.findSupplierByName(String(data.name || ""));
    const id = existing?.id ?? crypto.randomUUID();

    if (existing) {
      await dbExecute(
        `UPDATE suppliers SET phone = COALESCE(NULLIF(?, ''), phone), email = COALESCE(NULLIF(?, ''), email), document = COALESCE(NULLIF(?, ''), document), notes = COALESCE(NULLIF(?, ''), notes), updated_at = datetime('now') WHERE id = ?`,
        [data.phone, data.email, data.document, data.notes, id]
      );
      row.selectedAction = "update";
      row.targetEntityId = id;
      return;
    }

    await dbExecute(
      `INSERT INTO suppliers (id, clinic_id, name, phone, email, document, notes, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, CLINIC_ID, data.name, data.phone || null, data.email || null, data.document || null, data.notes || null]
    );
    row.targetEntityId = id;
  },

  async applyInventoryItemRow(row: DataImportRow, itemType: "medication" | "material"): Promise<void> {
    const data = row.mappedJson;
    const item = await this.findInventoryItem(String(data.name || ""), itemType);
    const categoryId = data.category ? await this.findOrCreateCategory(String(data.category), itemType) : null;
    const id = item?.id ?? crypto.randomUUID();

    if (item) {
      await dbExecute(
        `
          UPDATE inventory_items
          SET category_id = COALESCE(?, category_id),
              unit = COALESCE(NULLIF(?, ''), unit),
              minimum_stock = COALESCE(?, minimum_stock),
              notes = COALESCE(NULLIF(?, ''), notes),
              updated_at = datetime('now')
          WHERE id = ? AND clinic_id = ?
        `,
        [categoryId, data.unit, Number(data.minimum_stock || 0), data.notes, id, CLINIC_ID]
      );
      row.selectedAction = "update";
      row.targetEntityId = id;
      return;
    }

    await dbExecute(
      `
        INSERT INTO inventory_items (
          id, clinic_id, name, item_type, category_id, unit, current_stock,
          minimum_stock, requires_batch, requires_expiration, notes, is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, 1, 1, ?, 1)
      `,
      [
        id,
        CLINIC_ID,
        data.name,
        itemType,
        categoryId,
        data.unit || "un",
        Number(data.minimum_stock || 0),
        data.notes || null,
      ]
    );
    row.targetEntityId = id;
  },

  async applyInventoryBatchRow(row: DataImportRow): Promise<void> {
    const data = row.mappedJson;
    const itemType = String(data.item_type || "material") === "medication" ? "medication" : "material";
    let item = await this.findInventoryItem(String(data.item_name || ""), itemType);
    if (!item) {
      const itemId = crypto.randomUUID();
      await dbExecute(
        `
          INSERT INTO inventory_items (id, clinic_id, name, item_type, unit, current_stock, minimum_stock, requires_batch, requires_expiration, is_active)
          VALUES (?, ?, ?, ?, ?, 0, 0, 1, 1, 1)
        `,
        [itemId, CLINIC_ID, data.item_name, itemType, data.unit || "un"]
      );
      item = { id: itemId };
    }

    const supplierId = data.supplier_name ? await this.findOrCreateSupplier(String(data.supplier_name)) : null;
    const existingBatch = await this.findBatch(String(item.id), String(data.batch_number || ""), String(data.expiration_date || ""));
    const quantity = Number(data.quantity || 0);

    if (existingBatch) {
      await dbExecute(
        `UPDATE inventory_batches SET current_quantity = current_quantity + ?, updated_at = datetime('now') WHERE id = ?`,
        [quantity, existingBatch.id]
      );
      row.selectedAction = "update";
      row.targetEntityId = existingBatch.id;
    } else {
      const batchId = crypto.randomUUID();
      await dbExecute(
        `
          INSERT INTO inventory_batches (
            id, clinic_id, inventory_item_id, batch_number, expiration_date,
            supplier_id, entry_date, initial_quantity, current_quantity, invoice_number
          )
          VALUES (?, ?, ?, ?, ?, ?, date('now'), ?, ?, ?)
        `,
        [
          batchId,
          CLINIC_ID,
          item.id,
          data.batch_number || "SEM-LOTE",
          data.expiration_date || null,
          supplierId,
          quantity,
          quantity,
          data.invoice_number || null,
        ]
      );
      row.targetEntityId = batchId;
    }

    await dbExecute(
      `UPDATE inventory_items SET current_stock = current_stock + ?, updated_at = datetime('now') WHERE id = ?`,
      [quantity, item.id]
    );

    await dbExecute(
      `
        INSERT INTO stock_movements (
          id, clinic_id, inventory_item_id, inventory_batch_id, movement_type,
          quantity, unit, reason, notes
        )
        VALUES (?, ?, ?, ?, 'entry', ?, ?, 'import_in', ?)
      `,
      [
        crypto.randomUUID(),
        CLINIC_ID,
        item.id,
        row.targetEntityId,
        quantity,
        data.unit || "un",
        `Importacao CSV job ${row.importJobId}`,
      ]
    );
  },

  async applyProtocolRow(row: DataImportRow): Promise<void> {
    const data = row.mappedJson;
    const existing = await this.findProtocolByName(String(data.name || ""));
    const id = existing?.id ?? crypto.randomUUID();

    if (existing) {
      await dbExecute(
        `
          UPDATE protocols
          SET description = COALESCE(NULLIF(?, ''), description),
              internal_notes = COALESCE(NULLIF(?, ''), internal_notes),
              updated_at = datetime('now')
          WHERE id = ? AND clinic_id = ?
        `,
        [data.description, data.notes, id, CLINIC_ID]
      );
      row.selectedAction = "update";
      row.targetEntityId = id;
      return;
    }

    await dbExecute(
      `
        INSERT INTO protocols (id, clinic_id, name, description, internal_notes, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `,
      [id, CLINIC_ID, data.name, data.description || null, data.notes || null]
    );
    row.targetEntityId = id;
  },

  async findSupplierByName(name: string): Promise<{ id: string } | null> {
    const rows = await dbSelect<{ id: string }>(
      `SELECT id FROM suppliers WHERE clinic_id = ? AND deleted_at IS NULL AND lower(name) = lower(?) LIMIT 1`,
      [CLINIC_ID, name.trim()]
    );
    return rows[0] ?? null;
  },

  async findOrCreateSupplier(name: string): Promise<string> {
    const existing = await this.findSupplierByName(name);
    if (existing) return existing.id;
    const id = crypto.randomUUID();
    await dbExecute(`INSERT INTO suppliers (id, clinic_id, name, is_active) VALUES (?, ?, ?, 1)`, [id, CLINIC_ID, name.trim()]);
    return id;
  },

  async findOrCreateCategory(name: string, appliesTo: string): Promise<string> {
    const rows = await dbSelect<{ id: string }>(
      `SELECT id FROM inventory_categories WHERE clinic_id = ? AND deleted_at IS NULL AND lower(name) = lower(?) LIMIT 1`,
      [CLINIC_ID, name.trim()]
    );
    if (rows[0]) return rows[0].id;
    const id = crypto.randomUUID();
    await dbExecute(
      `INSERT INTO inventory_categories (id, clinic_id, name, applies_to, is_active) VALUES (?, ?, ?, ?, 1)`,
      [id, CLINIC_ID, name.trim(), appliesTo]
    );
    return id;
  },

  async findInventoryItem(name: string, itemType: string): Promise<{ id: string } | null> {
    const rows = await dbSelect<{ id: string }>(
      `SELECT id FROM inventory_items WHERE clinic_id = ? AND deleted_at IS NULL AND item_type = ? AND lower(name) = lower(?) LIMIT 1`,
      [CLINIC_ID, itemType, name.trim()]
    );
    return rows[0] ?? null;
  },

  async findBatch(itemId: string, batchNumber: string, expirationDate: string): Promise<{ id: string } | null> {
    const rows = await dbSelect<{ id: string }>(
      `
        SELECT id FROM inventory_batches
        WHERE clinic_id = ? AND deleted_at IS NULL AND inventory_item_id = ?
          AND batch_number = ? AND COALESCE(expiration_date, '') = COALESCE(?, '')
        LIMIT 1
      `,
      [CLINIC_ID, itemId, batchNumber, expirationDate || null]
    );
    return rows[0] ?? null;
  },

  async findProtocolByName(name: string): Promise<{ id: string } | null> {
    const rows = await dbSelect<{ id: string }>(
      `SELECT id FROM protocols WHERE clinic_id = ? AND deleted_at IS NULL AND lower(name) = lower(?) LIMIT 1`,
      [CLINIC_ID, name.trim()]
    );
    return rows[0] ?? null;
  },
};
