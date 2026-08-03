import { dbExecute, dbSelect } from "@/lib/db/sqlite";
import type {
  CashGroupBy,
  FinancialCategory,
  FinancialFilters,
  FinancialPayable,
  FinancialPaymentMethod,
  FinancialReceivable,
  PayableInput,
  PaymentInput,
  ReceivableInput,
} from "../types";

const CLINIC_ID = "ana-morong-clinic";

function statusExpression(alias: string) {
  return `CASE
    WHEN ${alias}.status IN ('open','partially_paid') AND date(${alias}.due_date) < date('now', 'localtime') THEN 'overdue'
    ELSE ${alias}.status
  END`;
}

function addCommonFilters(
  sql: string,
  params: unknown[],
  filters: FinancialFilters | undefined,
  kind: "receivable" | "payable",
) {
  const alias = kind === "receivable" ? "r" : "p";
  const effectiveStatus = statusExpression(alias);

  if (filters?.status && filters.status !== "all") {
    if (filters.status === "overdue") {
      sql += ` AND ${effectiveStatus} = ?`;
    } else {
      sql += ` AND ${alias}.status = ?`;
    }
    params.push(filters.status);
  }

  if (filters?.startDate) {
    sql += ` AND date(${alias}.due_date) >= date(?)`;
    params.push(filters.startDate);
  }

  if (filters?.endDate) {
    sql += ` AND date(${alias}.due_date) <= date(?)`;
    params.push(filters.endDate);
  }

  if (filters?.categoryId) {
    sql += ` AND ${alias}.category_id = ?`;
    params.push(filters.categoryId);
  }

  if (filters?.paymentMethodId) {
    sql += ` AND ${alias}.payment_method_id = ?`;
    params.push(filters.paymentMethodId);
  }

  if (kind === "receivable" && filters?.patientId) {
    sql += ` AND r.patient_id = ?`;
    params.push(filters.patientId);
  }

  if (kind === "payable" && filters?.supplierId) {
    sql += ` AND p.supplier_id = ?`;
    params.push(filters.supplierId);
  }

  if (filters?.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    if (kind === "receivable") {
      sql += ` AND (r.description LIKE ? OR pat.full_name LIKE ? OR prot.name LIKE ?)`;
      params.push(term, term, term);
    } else {
      sql += ` AND (p.description LIKE ? OR s.name LIKE ? OR ir.invoice_number LIKE ?)`;
      params.push(term, term, term);
    }
  }

  return sql;
}

export const financialRepository = {
  async listCategories(): Promise<FinancialCategory[]> {
    return dbSelect<FinancialCategory>(`
      SELECT *
      FROM financial_categories
      WHERE clinic_id = ? AND deleted_at IS NULL
      ORDER BY type ASC, name ASC
    `, [CLINIC_ID]);
  },

  async createCategory(data: { name: string; type: string; parentId?: string | null; isActive?: boolean }): Promise<string> {
    const id = crypto.randomUUID();
    await dbExecute(`
      INSERT INTO financial_categories (id, clinic_id, name, type, parent_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, CLINIC_ID, data.name, data.type, data.parentId ?? null, data.isActive === false ? 0 : 1]);
    return id;
  },

  async setCategoryActive(id: string, isActive: boolean): Promise<void> {
    await dbExecute(`
      UPDATE financial_categories
      SET is_active = ?, updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ?
    `, [isActive ? 1 : 0, id, CLINIC_ID]);
  },

  async listPaymentMethods(): Promise<FinancialPaymentMethod[]> {
    return dbSelect<FinancialPaymentMethod>(`
      SELECT *
      FROM financial_payment_methods
      WHERE clinic_id = ? AND is_active = 1
      ORDER BY name ASC
    `, [CLINIC_ID]);
  },

  async listLookupPatients(): Promise<Array<{ id: string; full_name: string }>> {
    return dbSelect(`
      SELECT id, full_name
      FROM patients
      WHERE clinic_id = ? AND deleted_at IS NULL AND is_active = 1
      ORDER BY full_name ASC
    `, [CLINIC_ID]);
  },

  async listLookupSuppliers(): Promise<Array<{ id: string; name: string }>> {
    return dbSelect(`
      SELECT id, name
      FROM suppliers
      WHERE clinic_id = ? AND deleted_at IS NULL AND is_active = 1
      ORDER BY name ASC
    `, [CLINIC_ID]);
  },

  async listLookupProtocols(): Promise<Array<{ id: string; name: string }>> {
    return dbSelect(`
      SELECT id, name
      FROM protocols
      WHERE clinic_id = ? AND deleted_at IS NULL AND is_active = 1
      ORDER BY name ASC
    `, [CLINIC_ID]);
  },

  async listFinalizedProcedures(): Promise<any[]> {
    return dbSelect(`
      SELECT
        p.id,
        p.patient_id,
        pat.full_name AS patient_name,
        p.protocol_id,
        prot.name AS protocol_name,
        p.finalized_at,
        COALESCE((
          SELECT SUM(piu.quantity_used * COALESCE(ib.unit_cost, 0))
          FROM procedure_items_used piu
          LEFT JOIN inventory_batches ib ON ib.id = piu.inventory_batch_id
          WHERE piu.procedure_id = p.id AND COALESCE(piu.is_corrected, 0) = 0
        ), 0) AS estimated_cost
      FROM procedures p
      JOIN patients pat ON pat.id = p.patient_id
      LEFT JOIN protocols prot ON prot.id = p.protocol_id
      WHERE p.clinic_id = ? AND p.status = 'finalized' AND p.deleted_at IS NULL
      ORDER BY p.finalized_at DESC
      LIMIT 300
    `, [CLINIC_ID]);
  },

  async listInventoryReceiptsWithoutPayable(): Promise<any[]> {
    return dbSelect(`
      SELECT
        ir.id,
        ir.supplier_id,
        COALESCE(s.name, ir.supplier_name_snapshot) AS supplier_name,
        ir.invoice_number,
        ir.entry_date,
        COALESCE(SUM(iri.total_cost), 0) AS total_cost
      FROM inventory_receipts ir
      LEFT JOIN suppliers s ON s.id = ir.supplier_id
      LEFT JOIN inventory_receipt_items iri ON iri.receipt_id = ir.id AND iri.deleted_at IS NULL
      WHERE ir.clinic_id = ?
        AND ir.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM financial_payables fp
          WHERE fp.inventory_receipt_id = ir.id AND fp.deleted_at IS NULL
        )
      GROUP BY ir.id
      HAVING total_cost > 0
      ORDER BY ir.entry_date DESC
      LIMIT 300
    `, [CLINIC_ID]);
  },

  async findReceivableByProcedureId(procedureId: string): Promise<FinancialReceivable | null> {
    const rows = await dbSelect<FinancialReceivable>(`
      SELECT r.*, ${statusExpression("r")} AS effective_status
      FROM financial_receivables r
      WHERE r.procedure_id = ? AND r.deleted_at IS NULL
      ORDER BY r.created_at DESC
      LIMIT 1
    `, [procedureId]);
    return rows[0] ?? null;
  },

  async findReceivable(id: string): Promise<FinancialReceivable | null> {
    const rows = await dbSelect<FinancialReceivable>(`
      SELECT r.*, ${statusExpression("r")} AS effective_status
      FROM financial_receivables r
      WHERE r.id = ? AND r.deleted_at IS NULL
    `, [id]);
    return rows[0] ?? null;
  },

  async findPayable(id: string): Promise<FinancialPayable | null> {
    const rows = await dbSelect<FinancialPayable>(`
      SELECT p.*, ${statusExpression("p")} AS effective_status
      FROM financial_payables p
      WHERE p.id = ? AND p.deleted_at IS NULL
    `, [id]);
    return rows[0] ?? null;
  },

  async listReceivables(filters?: FinancialFilters): Promise<FinancialReceivable[]> {
    const params: unknown[] = [CLINIC_ID];
    let sql = `
      SELECT
        r.*,
        ${statusExpression("r")} AS effective_status,
        pat.full_name AS patient_name,
        prot.name AS protocol_name,
        c.name AS category_name,
        pm.name AS payment_method_name
      FROM financial_receivables r
      LEFT JOIN patients pat ON pat.id = r.patient_id
      LEFT JOIN protocols prot ON prot.id = r.protocol_id
      LEFT JOIN financial_categories c ON c.id = r.category_id
      LEFT JOIN financial_payment_methods pm ON pm.id = r.payment_method_id
      WHERE r.clinic_id = ? AND r.deleted_at IS NULL
    `;
    sql = addCommonFilters(sql, params, filters, "receivable");
    sql += ` ORDER BY date(r.due_date) ASC, r.created_at DESC`;
    return dbSelect<FinancialReceivable>(sql, params);
  },

  async listPayables(filters?: FinancialFilters): Promise<FinancialPayable[]> {
    const params: unknown[] = [CLINIC_ID];
    let sql = `
      SELECT
        p.*,
        ${statusExpression("p")} AS effective_status,
        s.name AS supplier_name,
        c.name AS category_name,
        pm.name AS payment_method_name,
        ir.invoice_number
      FROM financial_payables p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      LEFT JOIN inventory_receipts ir ON ir.id = p.inventory_receipt_id
      LEFT JOIN financial_categories c ON c.id = p.category_id
      LEFT JOIN financial_payment_methods pm ON pm.id = p.payment_method_id
      WHERE p.clinic_id = ? AND p.deleted_at IS NULL
    `;
    sql = addCommonFilters(sql, params, filters, "payable");
    sql += ` ORDER BY date(p.due_date) ASC, p.created_at DESC`;
    return dbSelect<FinancialPayable>(sql, params);
  },

  async createReceivable(data: ReceivableInput): Promise<string> {
    const id = crypto.randomUUID();
    await dbExecute(`
      INSERT INTO financial_receivables (
        id, clinic_id, patient_id, procedure_id, protocol_id, category_id,
        description, amount, due_date, payment_method_id, notes, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      CLINIC_ID,
      data.patientId || null,
      data.procedureId || null,
      data.protocolId || null,
      data.categoryId || "fin-cat-income-procedures",
      data.description,
      data.amount,
      data.dueDate,
      data.paymentMethodId || null,
      data.notes || null,
      data.createdByUserId || null,
    ]);
    return id;
  },

  async updateReceivable(id: string, data: ReceivableInput): Promise<void> {
    await dbExecute(`
      UPDATE financial_receivables
      SET patient_id = ?, procedure_id = ?, protocol_id = ?, category_id = ?,
          description = ?, amount = ?, due_date = ?, payment_method_id = ?,
          notes = ?, updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ?
    `, [
      data.patientId || null,
      data.procedureId || null,
      data.protocolId || null,
      data.categoryId || null,
      data.description,
      data.amount,
      data.dueDate,
      data.paymentMethodId || null,
      data.notes || null,
      id,
      CLINIC_ID,
    ]);
  },

  async createPayable(data: PayableInput): Promise<string> {
    const id = crypto.randomUUID();
    await dbExecute(`
      INSERT INTO financial_payables (
        id, clinic_id, supplier_id, inventory_receipt_id, category_id,
        description, amount, due_date, payment_method_id, notes, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      CLINIC_ID,
      data.supplierId || null,
      data.inventoryReceiptId || null,
      data.categoryId || "fin-cat-exp-suppliers",
      data.description,
      data.amount,
      data.dueDate,
      data.paymentMethodId || null,
      data.notes || null,
      data.createdByUserId || null,
    ]);
    return id;
  },

  async updatePayable(id: string, data: PayableInput): Promise<void> {
    await dbExecute(`
      UPDATE financial_payables
      SET supplier_id = ?, inventory_receipt_id = ?, category_id = ?,
          description = ?, amount = ?, due_date = ?, payment_method_id = ?,
          notes = ?, updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ?
    `, [
      data.supplierId || null,
      data.inventoryReceiptId || null,
      data.categoryId || null,
      data.description,
      data.amount,
      data.dueDate,
      data.paymentMethodId || null,
      data.notes || null,
      id,
      CLINIC_ID,
    ]);
  },

  async cancelReceivable(id: string): Promise<void> {
    await dbExecute(`
      UPDATE financial_receivables
      SET status = 'cancelled', updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ?
    `, [id, CLINIC_ID]);
  },

  async cancelPayable(id: string): Promise<void> {
    await dbExecute(`
      UPDATE financial_payables
      SET status = 'cancelled', updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ?
    `, [id, CLINIC_ID]);
  },

  async createPayment(direction: "in" | "out", targetId: string, data: PaymentInput): Promise<string> {
    const id = crypto.randomUUID();
    await dbExecute(`
      INSERT INTO financial_payments (
        id, clinic_id, direction, receivable_id, payable_id, amount, paid_at,
        payment_method_id, notes, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      CLINIC_ID,
      direction,
      direction === "in" ? targetId : null,
      direction === "out" ? targetId : null,
      data.amount,
      data.paidAt,
      data.paymentMethodId ?? null,
      data.notes ?? null,
      data.createdByUserId ?? null,
    ]);
    return id;
  },

  async updateReceivablePaidState(id: string): Promise<void> {
    await dbExecute(`
      UPDATE financial_receivables
      SET paid_amount = COALESCE((SELECT SUM(amount) FROM financial_payments WHERE receivable_id = financial_receivables.id), 0),
          paid_at = CASE
            WHEN COALESCE((SELECT SUM(amount) FROM financial_payments WHERE receivable_id = financial_receivables.id), 0) >= amount
            THEN COALESCE((SELECT MAX(paid_at) FROM financial_payments WHERE receivable_id = financial_receivables.id), paid_at)
            ELSE paid_at
          END,
          status = CASE
            WHEN status = 'cancelled' THEN 'cancelled'
            WHEN COALESCE((SELECT SUM(amount) FROM financial_payments WHERE receivable_id = financial_receivables.id), 0) >= amount THEN 'paid'
            WHEN COALESCE((SELECT SUM(amount) FROM financial_payments WHERE receivable_id = financial_receivables.id), 0) > 0 THEN 'partially_paid'
            ELSE 'open'
          END,
          updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ?
    `, [id, CLINIC_ID]);
  },

  async updatePayablePaidState(id: string): Promise<void> {
    await dbExecute(`
      UPDATE financial_payables
      SET paid_amount = COALESCE((SELECT SUM(amount) FROM financial_payments WHERE payable_id = financial_payables.id), 0),
          paid_at = CASE
            WHEN COALESCE((SELECT SUM(amount) FROM financial_payments WHERE payable_id = financial_payables.id), 0) >= amount
            THEN COALESCE((SELECT MAX(paid_at) FROM financial_payments WHERE payable_id = financial_payables.id), paid_at)
            ELSE paid_at
          END,
          status = CASE
            WHEN status = 'cancelled' THEN 'cancelled'
            WHEN COALESCE((SELECT SUM(amount) FROM financial_payments WHERE payable_id = financial_payables.id), 0) >= amount THEN 'paid'
            WHEN COALESCE((SELECT SUM(amount) FROM financial_payments WHERE payable_id = financial_payables.id), 0) > 0 THEN 'partially_paid'
            ELSE 'open'
          END,
          updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ?
    `, [id, CLINIC_ID]);
  },

  async getPayments(startDate: string, endDate: string): Promise<any[]> {
    return dbSelect(`
      SELECT fp.*, pm.name AS payment_method_name
      FROM financial_payments fp
      LEFT JOIN financial_payment_methods pm ON pm.id = fp.payment_method_id
      WHERE fp.clinic_id = ?
        AND date(fp.paid_at) >= date(?)
        AND date(fp.paid_at) <= date(?)
      ORDER BY fp.paid_at ASC
    `, [CLINIC_ID, startDate, endDate]);
  },

  async getProcedureFinancialRows(startDate: string, endDate: string): Promise<any[]> {
    return dbSelect(`
      SELECT
        p.id AS procedure_id,
        p.patient_id,
        pat.full_name AS patient_name,
        p.protocol_id,
        COALESCE(prot.name, 'Sem protocolo') AS protocol_name,
        p.finalized_at,
        COALESCE(SUM(CASE WHEN r.status != 'cancelled' THEN r.amount ELSE 0 END), 0) AS revenue,
        COALESCE((
          SELECT SUM(
            piu.quantity_used * COALESCE(
              NULLIF(ib.unit_cost, 0),
              (SELECT b2.unit_cost
               FROM inventory_batches b2
               WHERE b2.inventory_item_id = piu.inventory_item_id
                 AND b2.unit_cost IS NOT NULL AND b2.unit_cost > 0
                 AND b2.deleted_at IS NULL
               ORDER BY b2.created_at DESC LIMIT 1),
              NULLIF(ii.cost_price, 0),
              0
            )
          )
          FROM procedure_items_used piu
          LEFT JOIN inventory_batches ib ON ib.id = piu.inventory_batch_id
          LEFT JOIN inventory_items ii ON ii.id = piu.inventory_item_id
          WHERE piu.procedure_id = p.id AND COALESCE(piu.is_corrected, 0) = 0
        ), 0) AS cost,
        COALESCE((
          SELECT COUNT(*)
          FROM procedure_items_used piu
          LEFT JOIN inventory_batches ib ON ib.id = piu.inventory_batch_id
          LEFT JOIN inventory_items ii ON ii.id = piu.inventory_item_id
          WHERE piu.procedure_id = p.id
            AND COALESCE(piu.is_corrected, 0) = 0
            AND COALESCE(NULLIF(ib.unit_cost, 0), NULLIF(ii.cost_price, 0), 0) = 0
            AND (
              SELECT COUNT(*) FROM inventory_batches b2
              WHERE b2.inventory_item_id = piu.inventory_item_id
                AND b2.unit_cost IS NOT NULL AND b2.unit_cost > 0
                AND b2.deleted_at IS NULL
            ) = 0
        ), 0) AS items_without_cost
      FROM procedures p
      JOIN patients pat ON pat.id = p.patient_id
      LEFT JOIN protocols prot ON prot.id = p.protocol_id
      LEFT JOIN financial_receivables r ON r.procedure_id = p.id AND r.deleted_at IS NULL AND r.status != 'cancelled'
      WHERE p.clinic_id = ?
        AND p.status = 'finalized'
        AND p.deleted_at IS NULL
        AND date(COALESCE(p.finalized_at, p.performed_at)) >= date(?)
        AND date(COALESCE(p.finalized_at, p.performed_at)) <= date(?)
      GROUP BY p.id
      ORDER BY p.finalized_at DESC
    `, [CLINIC_ID, startDate, endDate]);
  },

  async getExpenseRows(startDate: string, endDate: string): Promise<any[]> {
    // Despesas do período: pagamentos realizados (caixa) no intervalo
    return dbSelect(`
      SELECT
        p.id,
        p.category_id,
        c.name AS category_name,
        s.name AS supplier_name,
        p.description,
        p.due_date,
        fp.paid_at,
        fp.amount AS amount,
        p.status,
        ${statusExpression("p")} AS effective_status
      FROM financial_payments fp
      JOIN financial_payables p ON p.id = fp.payable_id
      LEFT JOIN financial_categories c ON c.id = p.category_id
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE fp.clinic_id = ?
        AND fp.direction = 'out'
        AND p.deleted_at IS NULL
        AND p.status != 'cancelled'
        AND date(fp.paid_at) >= date(?)
        AND date(fp.paid_at) <= date(?)
      ORDER BY fp.paid_at ASC
    `, [CLINIC_ID, startDate, endDate]);
  },

  async getCashFlowSourceRows(startDate: string, endDate: string): Promise<any[]> {
    return dbSelect(`
      SELECT 'realized_income' AS row_type, date(paid_at) AS movement_date, amount
      FROM financial_payments
      WHERE clinic_id = ? AND direction = 'in' AND date(paid_at) BETWEEN date(?) AND date(?)
      UNION ALL
      SELECT 'realized_expense' AS row_type, date(paid_at) AS movement_date, amount
      FROM financial_payments
      WHERE clinic_id = ? AND direction = 'out' AND date(paid_at) BETWEEN date(?) AND date(?)
      UNION ALL
      SELECT 'projected_income' AS row_type, date(due_date) AS movement_date, amount - paid_amount AS amount
      FROM financial_receivables
      WHERE clinic_id = ? AND deleted_at IS NULL AND status IN ('open','partially_paid') AND date(due_date) BETWEEN date(?) AND date(?)
      UNION ALL
      SELECT 'projected_expense' AS row_type, date(due_date) AS movement_date, amount - paid_amount AS amount
      FROM financial_payables
      WHERE clinic_id = ? AND deleted_at IS NULL AND status IN ('open','partially_paid') AND date(due_date) BETWEEN date(?) AND date(?)
    `, [
      CLINIC_ID, startDate, endDate,
      CLINIC_ID, startDate, endDate,
      CLINIC_ID, startDate, endDate,
      CLINIC_ID, startDate, endDate,
    ]);
  },

  async getOpenCounts(): Promise<any> {
    const rows = await dbSelect<any>(`
      SELECT
        (SELECT COUNT(*) FROM financial_receivables WHERE clinic_id = ? AND deleted_at IS NULL AND status IN ('open','partially_paid') AND date(due_date) < date('now', 'localtime')) AS overdue_receivables,
        (SELECT COUNT(*) FROM financial_payables WHERE clinic_id = ? AND deleted_at IS NULL AND status IN ('open','partially_paid') AND date(due_date) < date('now', 'localtime')) AS overdue_payables,
        (SELECT COUNT(*) FROM inventory_items i WHERE i.current_stock > 0 AND i.is_active = 1 AND (
          SELECT COUNT(*) FROM inventory_batches b WHERE b.inventory_item_id = i.id AND b.unit_cost IS NOT NULL AND b.unit_cost > 0
        ) = 0) AS items_without_cost
    `, [CLINIC_ID, CLINIC_ID]);
    return rows[0] ?? { overdue_receivables: 0, overdue_payables: 0, items_without_cost: 0 };
  },

  groupByExpression(groupBy: CashGroupBy) {
    if (groupBy === "month") return "%Y-%m";
    if (groupBy === "week") return "%Y-W%W";
    return "%Y-%m-%d";
  },
};
