import { dbExecute } from "@/lib/db/sqlite";
import { CLINIC_ID } from "../types";

export const inventoryReceiptRepository = {
  async createReceipt(id: string, data: {
    receiptType: "manual" | "xml";
    supplierId?: string | null;
    supplierNameSnapshot?: string | null;
    invoiceNumber?: string | null;
    invoiceKey?: string | null;
    invoiceXmlPath?: string | null;
    entryDate: string;
    notes?: string | null;
    createdByUserId?: string | null;
  }): Promise<void> {
    await dbExecute(`
      INSERT INTO inventory_receipts (
        id, clinic_id, receipt_type, supplier_id, supplier_name_snapshot,
        invoice_number, invoice_key, invoice_xml_path, entry_date, status, notes, created_by_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)
    `, [
      id,
      CLINIC_ID,
      data.receiptType,
      data.supplierId ?? null,
      data.supplierNameSnapshot ?? null,
      data.invoiceNumber ?? null,
      data.invoiceKey ?? null,
      data.invoiceXmlPath ?? null,
      data.entryDate,
      data.notes ?? null,
      data.createdByUserId ?? null,
    ]);
  },

  async createReceiptItem(id: string, data: {
    receiptId: string;
    inventoryItemId: string;
    rawProductName?: string | null;
    rawProductCode?: string | null;
    rawUnit?: string | null;
    rawQuantity?: number | null;
    commercialQuantity: number;
    commercialUnit: string;
    contentPerCommercialUnit: number;
    controlUnit: string;
    totalControlQuantity: number;
    batchNumber?: string | null;
    expirationDate?: string | null;
    manufacturingDate?: string | null;
    supplierId?: string | null;
    unitCost?: number | null;
    totalCost?: number | null;
    notes?: string | null;
  }): Promise<void> {
    await dbExecute(`
      INSERT INTO inventory_receipt_items (
        id, clinic_id, receipt_id, inventory_item_id, raw_product_name, raw_product_code,
        raw_unit, raw_quantity, commercial_quantity, commercial_unit, content_per_commercial_unit,
        control_unit, total_control_quantity, batch_number, expiration_date, manufacturing_date,
        supplier_id, unit_cost, total_cost, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      CLINIC_ID,
      data.receiptId,
      data.inventoryItemId,
      data.rawProductName ?? null,
      data.rawProductCode ?? null,
      data.rawUnit ?? null,
      data.rawQuantity ?? null,
      data.commercialQuantity,
      data.commercialUnit,
      data.contentPerCommercialUnit,
      data.controlUnit,
      data.totalControlQuantity,
      data.batchNumber ?? null,
      data.expirationDate ?? null,
      data.manufacturingDate ?? null,
      data.supplierId ?? null,
      data.unitCost ?? null,
      data.totalCost ?? null,
      data.notes ?? null,
    ]);
  },
};

