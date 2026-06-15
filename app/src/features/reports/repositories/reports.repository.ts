import { dbSelect } from "@/lib/db/sqlite";
import type {
  ConsumptionRow,
  DashboardKPIs,
  DetailedReportColumn,
  DetailedReportData,
  PatientGeneralReportData,
  PatientHistoryRow,
  ReportFilter,
  ReportType,
  StockMovementRow,
  StockPositionRow,
  TraceabilityRow,
} from "../schemas/report.schema";

const CLINIC_ID = "ana-morong-clinic";

type ReportRow = Record<string, string | number | null>;

const itemTypeLabel: Record<string, string> = {
  medication: "Medicamento",
  material: "Material",
  equipment: "Equipamento",
  other: "Outro",
};

const movementTypeLabels: Record<string, string> = {
  entry: "Entrada",
  exit: "Saida",
  automatic_exit: "Uso em paciente",
  adjustment: "Ajuste",
  loss: "Perda",
  expired: "Vencido",
  correction: "Correcao",
};

function addDateRange(
  conditions: string[],
  params: unknown[],
  column: string,
  filter: ReportFilter
) {
  if (filter.startDate) {
    conditions.push(`date(${column}) >= date(?)`);
    params.push(filter.startDate);
  }
  if (filter.endDate) {
    conditions.push(`date(${column}) <= date(?)`);
    params.push(filter.endDate);
  }
}

function addPatientFilter(conditions: string[], params: unknown[], alias: string, filter: ReportFilter) {
  if (filter.patientId) {
    conditions.push(`${alias}.patient_id = ?`);
    params.push(filter.patientId);
  }
}

function addInventoryFilters(conditions: string[], params: unknown[], filter: ReportFilter) {
  if (filter.categoryId) {
    conditions.push("i.category_id = ?");
    params.push(filter.categoryId);
  }
  if (filter.itemType) {
    conditions.push("i.item_type = ?");
    params.push(filter.itemType);
  }
}

function periodSubtitle(filter: ReportFilter) {
  const start = filter.startDate || "inicio";
  const end = filter.endDate || "hoje";
  return `Periodo: ${start} ate ${end}`;
}

function buildReport(
  title: string,
  subtitle: string,
  columns: DetailedReportColumn[],
  rows: ReportRow[],
  notes?: string[]
): DetailedReportData {
  return {
    title,
    subtitle,
    columns,
    rows,
    summary: [
      { label: "Registros", value: rows.length, tone: rows.length ? "info" : "neutral" },
    ],
    notes,
  };
}

export const reportsRepository = {
  async getDashboardKPIs(): Promise<DashboardKPIs> {
    const [activeProducts] = await dbSelect<{ count: number }>(
      `
        SELECT COUNT(*) as count
        FROM inventory_items
        WHERE clinic_id = ? AND deleted_at IS NULL AND is_active = 1
      `,
      [CLINIC_ID]
    );

    const [stockHealth] = await dbSelect<{ low_stock: number; expiring: number }>(
      `
        SELECT
          SUM(CASE WHEN COALESCE(total_qty, 0) < minimum_stock THEN 1 ELSE 0 END) as low_stock,
          SUM(CASE WHEN next_exp IS NOT NULL AND next_exp <= date('now', '+30 days') THEN 1 ELSE 0 END) as expiring
        FROM (
          SELECT
            i.id,
            i.minimum_stock,
            SUM(b.current_quantity) as total_qty,
            MIN(b.expiration_date) as next_exp
          FROM inventory_items i
          LEFT JOIN inventory_batches b
            ON b.inventory_item_id = i.id
           AND b.current_quantity > 0
           AND b.deleted_at IS NULL
          WHERE i.clinic_id = ? AND i.deleted_at IS NULL AND i.is_active = 1
          GROUP BY i.id
        )
      `,
      [CLINIC_ID]
    );

    const [volume] = await dbSelect<{ count: number }>(
      `
        SELECT COUNT(*) as count
        FROM procedures
        WHERE clinic_id = ?
          AND status = 'finalized'
          AND deleted_at IS NULL
          AND date(performed_at) >= date('now', '-30 days')
      `,
      [CLINIC_ID]
    );

    return {
      totalActiveProducts: activeProducts?.count || 0,
      lowStockItems: stockHealth?.low_stock || 0,
      expiringBatches: stockHealth?.expiring || 0,
      totalProcedures30Days: volume?.count || 0,
    };
  },

  async getStockPosition(filter: ReportFilter): Promise<StockPositionRow[]> {
    const conditions = ["i.clinic_id = ?", "i.deleted_at IS NULL"];
    const params: unknown[] = [CLINIC_ID];
    addInventoryFilters(conditions, params, filter);

    return dbSelect<StockPositionRow>(
      `
        SELECT
          i.id AS item_id,
          i.name AS item_name,
          i.item_type,
          c.name AS category_name,
          i.unit AS control_unit,
          i.minimum_stock,
          COALESCE(SUM(b.current_quantity), 0) AS current_stock,
          COUNT(b.id) AS active_batches,
          MIN(b.expiration_date) AS next_expiration_date
        FROM inventory_items i
        LEFT JOIN inventory_categories c ON c.id = i.category_id
        LEFT JOIN inventory_batches b
          ON b.inventory_item_id = i.id
         AND b.current_quantity > 0
         AND b.deleted_at IS NULL
        WHERE ${conditions.join(" AND ")}
        GROUP BY i.id
        ORDER BY i.name ASC
      `,
      params
    );
  },

  async getStockMovements(filter: ReportFilter): Promise<StockMovementRow[]> {
    const conditions = ["m.clinic_id = ?"];
    const params: unknown[] = [CLINIC_ID];
    addDateRange(conditions, params, "m.movement_date", filter);
    addInventoryFilters(conditions, params, filter);

    if (filter.movementType && filter.movementType !== "all") {
      if (filter.movementType === "entry") {
        conditions.push("m.movement_type = 'entry'");
      } else if (filter.movementType === "exit") {
        conditions.push("m.movement_type IN ('exit', 'loss', 'expired', 'correction')");
      } else if (filter.movementType === "usage") {
        conditions.push("m.movement_type = 'automatic_exit'");
      }
    }

    return dbSelect<StockMovementRow>(
      `
        SELECT
          m.id,
          m.movement_type,
          m.movement_date AS created_at,
          i.name AS item_name,
          b.batch_number,
          m.quantity AS control_quantity,
          m.unit AS control_unit,
          m.reason,
          COALESCE(m.procedure_id, m.protocol_id, m.patient_id) AS reference_id
        FROM stock_movements m
        JOIN inventory_items i ON i.id = m.inventory_item_id
        LEFT JOIN inventory_batches b ON b.id = m.inventory_batch_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY m.movement_date DESC
      `,
      params
    );
  },

  async getConsumption(filter: ReportFilter): Promise<ConsumptionRow[]> {
    const conditions = [
      "m.clinic_id = ?",
      "m.movement_type IN ('exit', 'automatic_exit', 'loss', 'expired')",
    ];
    const params: unknown[] = [CLINIC_ID];
    addDateRange(conditions, params, "m.movement_date", filter);
    addInventoryFilters(conditions, params, filter);

    return dbSelect<ConsumptionRow>(
      `
        SELECT
          i.id AS item_id,
          i.name AS item_name,
          m.unit AS control_unit,
          SUM(m.quantity) AS total_consumed
        FROM stock_movements m
        JOIN inventory_items i ON i.id = m.inventory_item_id
        WHERE ${conditions.join(" AND ")}
        GROUP BY i.id, m.unit
        ORDER BY total_consumed DESC
      `,
      params
    );
  },

  async getTraceabilityByBatch(batchNumber: string): Promise<TraceabilityRow[]> {
    const search = `%${batchNumber}%`;
    return dbSelect<TraceabilityRow>(
      `
        SELECT
          pr.id AS procedure_id,
          pr.performed_at,
          pa.full_name AS patient_name,
          pt.name AS protocol_name,
          i.name AS item_name,
          pi.quantity_used,
          pi.unit AS control_unit
        FROM procedure_items_used pi
        JOIN procedures pr ON pr.id = pi.procedure_id AND pr.status = 'finalized'
        JOIN patients pa ON pa.id = pr.patient_id
        LEFT JOIN protocols pt ON pt.id = pr.protocol_id
        JOIN inventory_items i ON i.id = pi.inventory_item_id
        WHERE pi.clinic_id = ? AND pi.batch_number_snapshot LIKE ?
        ORDER BY pr.performed_at DESC
      `,
      [CLINIC_ID, search]
    );
  },

  async getPatientHistory(filter: ReportFilter): Promise<PatientHistoryRow[]> {
    const conditions = ["p.clinic_id = ?", "p.deleted_at IS NULL", "p.status = 'finalized'"];
    const params: unknown[] = [CLINIC_ID];
    addDateRange(conditions, params, "p.performed_at", filter);
    addPatientFilter(conditions, params, "p", filter);

    return dbSelect<PatientHistoryRow>(
      `
        SELECT
          p.id AS procedure_id,
          p.performed_at,
          p.patient_id,
          pat.full_name AS patient_name,
          pr.name AS protocol_name,
          COALESCE(a.display_name, a.name) AS body_area_name,
          p.had_intercurrence,
          (SELECT COUNT(*) FROM procedure_items_used pi WHERE pi.procedure_id = p.id) AS total_items_used
        FROM procedures p
        LEFT JOIN patients pat ON pat.id = p.patient_id
        LEFT JOIN protocols pr ON pr.id = p.protocol_id
        LEFT JOIN body_areas a ON a.id = p.body_area_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY p.performed_at DESC
      `,
      params
    );
  },

  async getPatientGeneralReport(patientId: string): Promise<PatientGeneralReportData> {
    const [patient] = await dbSelect<PatientGeneralReportData["patient"]>(
      `
        SELECT id, full_name, phone, email, birth_date, notes, alert_notes, created_at
        FROM patients
        WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL
      `,
      [patientId, CLINIC_ID]
    );

    if (!patient) {
      return { patient: null, procedures: [], used_items: [], used_batches: [] };
    }

    const procedures = await dbSelect<PatientGeneralReportData["procedures"][number]>(
      `
        SELECT
          p.id,
          p.performed_at,
          pr.name AS protocol_name,
          COALESCE(ba.display_name, ba.name) AS body_area_name,
          p.status,
          p.evolution_text,
          p.had_intercurrence,
          p.intercurrence_description,
          (SELECT COUNT(*) FROM procedure_items_used pi WHERE pi.procedure_id = p.id) AS total_items_used
        FROM procedures p
        LEFT JOIN protocols pr ON pr.id = p.protocol_id
        LEFT JOIN body_areas ba ON ba.id = p.body_area_id
        WHERE p.patient_id = ? AND p.clinic_id = ? AND p.deleted_at IS NULL
        ORDER BY p.performed_at DESC
      `,
      [patientId, CLINIC_ID]
    );

    const used_items = await dbSelect<PatientGeneralReportData["used_items"][number]>(
      `
        SELECT
          i.name AS item_name,
          pi.item_type,
          pi.unit,
          SUM(pi.quantity_used) AS total_quantity,
          COUNT(DISTINCT pi.inventory_batch_id) AS batches_used
        FROM procedure_items_used pi
        JOIN procedures p ON p.id = pi.procedure_id
        JOIN inventory_items i ON i.id = pi.inventory_item_id
        WHERE p.patient_id = ?
          AND p.clinic_id = ?
          AND p.deleted_at IS NULL
          AND p.status = 'finalized'
        GROUP BY i.id, pi.item_type, pi.unit
        ORDER BY total_quantity DESC
      `,
      [patientId, CLINIC_ID]
    );

    const used_batches = await dbSelect<PatientGeneralReportData["used_batches"][number]>(
      `
        SELECT
          i.name AS item_name,
          pi.batch_number_snapshot AS batch_number,
          pi.expiration_date_snapshot AS expiration_date,
          SUM(pi.quantity_used) AS total_quantity,
          pi.unit
        FROM procedure_items_used pi
        JOIN procedures p ON p.id = pi.procedure_id
        JOIN inventory_items i ON i.id = pi.inventory_item_id
        WHERE p.patient_id = ?
          AND p.clinic_id = ?
          AND p.deleted_at IS NULL
          AND p.status = 'finalized'
        GROUP BY i.id, pi.batch_number_snapshot, pi.expiration_date_snapshot, pi.unit
        ORDER BY i.name ASC, pi.batch_number_snapshot ASC
      `,
      [patientId, CLINIC_ID]
    );

    return { patient, procedures, used_items, used_batches };
  },

  async getDetailedReport(type: Exclude<ReportType, null>, filter: ReportFilter): Promise<DetailedReportData> {
    switch (type) {
      case "patient_evolutions":
        return this.getPatientEvolutionsReport(filter);
      case "patient_medications":
        return this.getPatientUsageReport(filter, "medication");
      case "patient_materials":
        return this.getPatientUsageReport(filter, "material");
      case "patient_batches":
        return this.getPatientBatchesReport(filter);
      case "patient_body_areas":
        return this.getPatientBodyAreasReport(filter);
      case "stock_low":
        return this.getStockLowReport(filter);
      case "stock_expirations":
        return this.getBatchExpirationReport(filter, "expiring");
      case "stock_expired":
        return this.getBatchExpirationReport(filter, "expired");
      case "stock_entries":
        return this.getStockMovementDetailReport({ ...filter, movementType: "entry" }, "Entradas no Estoque");
      case "stock_exits":
        return this.getStockMovementDetailReport({ ...filter, movementType: "exit" }, "Saidas do Estoque");
      case "batch_by_item":
        return this.getBatchesByItemReport(filter);
      case "protocols_list":
        return this.getProtocolsListReport(filter);
      case "protocol_procedures":
        return this.getProtocolProceduresReport(filter);
      case "audit_log":
        return this.getAuditLogReport(filter);
      case "labels_generated":
        return this.getLabelsGeneratedReport(filter);
      default:
        return buildReport("Relatorio", "Tipo de relatorio sem consulta configurada.", [], []);
    }
  },

  async getPatientEvolutionsReport(filter: ReportFilter): Promise<DetailedReportData> {
    const conditions = [
      "p.clinic_id = ?",
      "p.deleted_at IS NULL",
      "p.status = 'finalized'",
      "NULLIF(TRIM(COALESCE(p.evolution_text, '')), '') IS NOT NULL",
    ];
    const params: unknown[] = [CLINIC_ID];
    addDateRange(conditions, params, "p.performed_at", filter);
    addPatientFilter(conditions, params, "p", filter);

    const rows = await dbSelect<ReportRow>(
      `
        SELECT
          p.performed_at AS date,
          pat.full_name AS patient,
          COALESCE(pr.name, 'Aplicacao avulsa') AS protocol,
          COALESCE(ba.display_name, ba.name, '-') AS body_area,
          p.evolution_text AS evolution,
          COALESCE(p.intercurrence_description, '-') AS intercurrence
        FROM procedures p
        JOIN patients pat ON pat.id = p.patient_id
        LEFT JOIN protocols pr ON pr.id = p.protocol_id
        LEFT JOIN body_areas ba ON ba.id = p.body_area_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY p.performed_at DESC
      `,
      params
    );

    return buildReport("Evolucoes por Paciente", periodSubtitle(filter), [
      { key: "date", label: "Data" },
      { key: "patient", label: "Paciente" },
      { key: "protocol", label: "Protocolo" },
      { key: "body_area", label: "Area" },
      { key: "evolution", label: "Evolucao" },
      { key: "intercurrence", label: "Intercorrencia" },
    ], rows);
  },

  async getPatientUsageReport(filter: ReportFilter, itemType: "medication" | "material"): Promise<DetailedReportData> {
    const conditions = [
      "pi.clinic_id = ?",
      "p.deleted_at IS NULL",
      "p.status = 'finalized'",
      "pi.item_type = ?",
    ];
    const params: unknown[] = [CLINIC_ID, itemType];
    addDateRange(conditions, params, "p.performed_at", filter);
    addPatientFilter(conditions, params, "p", filter);

    const rows = await dbSelect<ReportRow>(
      `
        SELECT
          p.performed_at AS date,
          pat.full_name AS patient,
          COALESCE(pr.name, 'Aplicacao avulsa') AS protocol,
          i.name AS item,
          pi.batch_number_snapshot AS batch,
          pi.quantity_used AS quantity,
          pi.unit AS unit
        FROM procedure_items_used pi
        JOIN procedures p ON p.id = pi.procedure_id
        JOIN patients pat ON pat.id = p.patient_id
        LEFT JOIN protocols pr ON pr.id = p.protocol_id
        JOIN inventory_items i ON i.id = pi.inventory_item_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY p.performed_at DESC, i.name ASC
      `,
      params
    );

    return buildReport(
      itemType === "medication" ? "Medicamentos Usados por Paciente" : "Materiais Usados por Paciente",
      periodSubtitle(filter),
      [
        { key: "date", label: "Data" },
        { key: "patient", label: "Paciente" },
        { key: "protocol", label: "Protocolo" },
        { key: "item", label: "Item" },
        { key: "batch", label: "Lote" },
        { key: "quantity", label: "Qtd.", align: "right" },
        { key: "unit", label: "Un.", align: "center" },
      ],
      rows
    );
  },

  async getPatientBatchesReport(filter: ReportFilter): Promise<DetailedReportData> {
    const conditions = [
      "pi.clinic_id = ?",
      "p.deleted_at IS NULL",
      "p.status = 'finalized'",
      "NULLIF(TRIM(COALESCE(pi.batch_number_snapshot, '')), '') IS NOT NULL",
    ];
    const params: unknown[] = [CLINIC_ID];
    addDateRange(conditions, params, "p.performed_at", filter);
    addPatientFilter(conditions, params, "p", filter);
    if (filter.batchNumber) {
      conditions.push("pi.batch_number_snapshot LIKE ?");
      params.push(`%${filter.batchNumber}%`);
    }

    const rows = await dbSelect<ReportRow>(
      `
        SELECT
          p.performed_at AS date,
          pat.full_name AS patient,
          i.name AS item,
          pi.batch_number_snapshot AS batch,
          pi.expiration_date_snapshot AS expiration,
          pi.quantity_used AS quantity,
          pi.unit AS unit
        FROM procedure_items_used pi
        JOIN procedures p ON p.id = pi.procedure_id
        JOIN patients pat ON pat.id = p.patient_id
        JOIN inventory_items i ON i.id = pi.inventory_item_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY p.performed_at DESC, pi.batch_number_snapshot ASC
      `,
      params
    );

    return buildReport("Lotes Usados por Paciente", periodSubtitle(filter), [
      { key: "date", label: "Data" },
      { key: "patient", label: "Paciente" },
      { key: "item", label: "Item" },
      { key: "batch", label: "Lote" },
      { key: "expiration", label: "Validade" },
      { key: "quantity", label: "Qtd.", align: "right" },
      { key: "unit", label: "Un.", align: "center" },
    ], rows);
  },

  async getPatientBodyAreasReport(filter: ReportFilter): Promise<DetailedReportData> {
    const conditions = ["p.clinic_id = ?", "p.deleted_at IS NULL", "p.status = 'finalized'"];
    const params: unknown[] = [CLINIC_ID];
    addDateRange(conditions, params, "p.performed_at", filter);
    addPatientFilter(conditions, params, "p", filter);

    const rows = await dbSelect<ReportRow>(
      `
        SELECT
          COALESCE(ba.display_name, ba.name, 'Sem area informada') AS body_area,
          COUNT(*) AS applications,
          COUNT(DISTINCT p.patient_id) AS patients,
          MAX(p.performed_at) AS last_application
        FROM procedures p
        LEFT JOIN body_areas ba ON ba.id = p.body_area_id
        WHERE ${conditions.join(" AND ")}
        GROUP BY COALESCE(ba.name, 'Sem area informada')
        ORDER BY applications DESC, body_area ASC
      `,
      params
    );

    return buildReport("Areas Corporais Tratadas", periodSubtitle(filter), [
      { key: "body_area", label: "Area Corporal" },
      { key: "applications", label: "Aplicacoes", align: "right" },
      { key: "patients", label: "Pacientes", align: "right" },
      { key: "last_application", label: "Ultima Aplicacao" },
    ], rows);
  },

  async getStockLowReport(filter: ReportFilter): Promise<DetailedReportData> {
    const rows = (await this.getStockPosition(filter))
      .filter(item => Number(item.current_stock) < Number(item.minimum_stock))
      .map(item => ({
        item: item.item_name,
        type: itemTypeLabel[item.item_type] || item.item_type,
        category: item.category_name,
        current_stock: item.current_stock,
        minimum_stock: item.minimum_stock,
        missing: Math.max(Number(item.minimum_stock) - Number(item.current_stock), 0),
        unit: item.control_unit,
        active_batches: item.active_batches,
      }));

    const report = buildReport("Estoque Baixo", "Itens com saldo abaixo do minimo cadastrado.", [
      { key: "item", label: "Item" },
      { key: "type", label: "Tipo" },
      { key: "category", label: "Categoria" },
      { key: "current_stock", label: "Saldo", align: "right" },
      { key: "minimum_stock", label: "Minimo", align: "right" },
      { key: "missing", label: "Falta", align: "right" },
      { key: "unit", label: "Un.", align: "center" },
      { key: "active_batches", label: "Lotes", align: "right" },
    ], rows);
    report.summary = [
      { label: "Itens abaixo do minimo", value: rows.length, tone: rows.length ? "danger" : "success" },
    ];
    return report;
  },

  async getBatchExpirationReport(filter: ReportFilter, mode: "expiring" | "expired"): Promise<DetailedReportData> {
    const conditions = [
      "b.clinic_id = ?",
      "b.deleted_at IS NULL",
      "i.deleted_at IS NULL",
      "b.current_quantity > 0",
      "b.expiration_date IS NOT NULL",
    ];
    const params: unknown[] = [CLINIC_ID];
    addInventoryFilters(conditions, params, filter);

    if (mode === "expired") {
      conditions.push("date(b.expiration_date) < date('now')");
    } else {
      conditions.push("date(b.expiration_date) BETWEEN date('now') AND date('now', '+30 days')");
    }

    const rows = await dbSelect<ReportRow>(
      `
        SELECT
          i.name AS item,
          b.batch_number AS batch,
          b.expiration_date AS expiration,
          b.current_quantity AS quantity,
          i.unit AS unit,
          COALESCE(s.name, '-') AS supplier
        FROM inventory_batches b
        JOIN inventory_items i ON i.id = b.inventory_item_id
        LEFT JOIN suppliers s ON s.id = b.supplier_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY b.expiration_date ASC, i.name ASC
      `,
      params
    );

    return buildReport(
      mode === "expired" ? "Itens Vencidos" : "Vencimentos Proximos",
      mode === "expired" ? "Lotes com validade anterior a hoje." : "Lotes com vencimento nos proximos 30 dias.",
      [
        { key: "item", label: "Item" },
        { key: "batch", label: "Lote" },
        { key: "expiration", label: "Validade" },
        { key: "quantity", label: "Saldo", align: "right" },
        { key: "unit", label: "Un.", align: "center" },
        { key: "supplier", label: "Fornecedor" },
      ],
      rows
    );
  },

  async getStockMovementDetailReport(filter: ReportFilter, title: string): Promise<DetailedReportData> {
    const rows = (await this.getStockMovements(filter)).map(move => ({
      date: move.created_at,
      type: movementTypeLabels[move.movement_type] || move.movement_type,
      item: move.item_name,
      batch: move.batch_number,
      quantity: move.control_quantity,
      unit: move.control_unit,
      reason: move.reason,
    }));

    return buildReport(title, periodSubtitle(filter), [
      { key: "date", label: "Data" },
      { key: "type", label: "Tipo" },
      { key: "item", label: "Item" },
      { key: "batch", label: "Lote" },
      { key: "quantity", label: "Qtd.", align: "right" },
      { key: "unit", label: "Un.", align: "center" },
      { key: "reason", label: "Motivo" },
    ], rows);
  },

  async getBatchesByItemReport(filter: ReportFilter): Promise<DetailedReportData> {
    const conditions = ["i.clinic_id = ?", "i.deleted_at IS NULL", "b.deleted_at IS NULL"];
    const params: unknown[] = [CLINIC_ID];
    addInventoryFilters(conditions, params, filter);
    if (filter.batchNumber) {
      conditions.push("b.batch_number LIKE ?");
      params.push(`%${filter.batchNumber}%`);
    }

    const rows = await dbSelect<ReportRow>(
      `
        SELECT
          i.name AS item,
          CASE i.item_type
            WHEN 'medication' THEN 'Medicamento'
            WHEN 'material' THEN 'Material'
            WHEN 'equipment' THEN 'Equipamento'
            ELSE 'Outro'
          END AS type,
          b.batch_number AS batch,
          b.entry_date AS entry_date,
          b.expiration_date AS expiration,
          b.initial_quantity AS initial_quantity,
          b.current_quantity AS current_quantity,
          i.unit AS unit,
          COALESCE(s.name, '-') AS supplier
        FROM inventory_batches b
        JOIN inventory_items i ON i.id = b.inventory_item_id
        LEFT JOIN suppliers s ON s.id = b.supplier_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY i.name ASC, b.expiration_date ASC
      `,
      params
    );

    return buildReport("Lotes por Item", "Lista operacional de lotes cadastrados por item.", [
      { key: "item", label: "Item" },
      { key: "type", label: "Tipo" },
      { key: "batch", label: "Lote" },
      { key: "entry_date", label: "Entrada" },
      { key: "expiration", label: "Validade" },
      { key: "initial_quantity", label: "Qtd. Inicial", align: "right" },
      { key: "current_quantity", label: "Saldo", align: "right" },
      { key: "unit", label: "Un.", align: "center" },
      { key: "supplier", label: "Fornecedor" },
    ], rows);
  },

  async getProtocolsListReport(filter: ReportFilter): Promise<DetailedReportData> {
    const conditions = ["p.clinic_id = ?", "p.deleted_at IS NULL"];
    const params: unknown[] = [CLINIC_ID];
    if (filter.protocolId) {
      conditions.push("p.id = ?");
      params.push(filter.protocolId);
    }

    const rows = await dbSelect<ReportRow>(
      `
        SELECT
          p.name AS protocol,
          COALESCE(c.name, '-') AS category,
          COALESCE(r.name, '-') AS route,
          CASE WHEN p.is_active = 1 THEN 'Ativo' ELSE 'Inativo' END AS status,
          COUNT(DISTINCT pi.id) AS items,
          COUNT(DISTINCT pr.id) AS finalized_applications,
          p.created_at AS created_at
        FROM protocols p
        LEFT JOIN inventory_categories c ON c.id = p.category_id
        LEFT JOIN administration_routes r ON r.id = p.administration_route_id
        LEFT JOIN protocol_items pi ON pi.protocol_id = p.id AND pi.deleted_at IS NULL
        LEFT JOIN procedures pr ON pr.protocol_id = p.id AND pr.status = 'finalized' AND pr.deleted_at IS NULL
        WHERE ${conditions.join(" AND ")}
        GROUP BY p.id
        ORDER BY p.name ASC
      `,
      params
    );

    return buildReport("Protocolos Cadastrados", "Protocolos, itens configurados e volume de uso.", [
      { key: "protocol", label: "Protocolo" },
      { key: "category", label: "Categoria" },
      { key: "route", label: "Via" },
      { key: "status", label: "Status", align: "center" },
      { key: "items", label: "Itens", align: "right" },
      { key: "finalized_applications", label: "Aplicacoes", align: "right" },
      { key: "created_at", label: "Criado em" },
    ], rows);
  },

  async getProtocolProceduresReport(filter: ReportFilter): Promise<DetailedReportData> {
    const conditions = ["p.clinic_id = ?", "p.deleted_at IS NULL", "p.status = 'finalized'"];
    const params: unknown[] = [CLINIC_ID];
    addDateRange(conditions, params, "p.performed_at", filter);
    if (filter.protocolId) {
      conditions.push("p.protocol_id = ?");
      params.push(filter.protocolId);
    }

    const rows = await dbSelect<ReportRow>(
      `
        SELECT
          COALESCE(pr.name, 'Aplicacao avulsa') AS protocol,
          COUNT(*) AS applications,
          COUNT(DISTINCT p.patient_id) AS patients,
          MIN(p.performed_at) AS first_application,
          MAX(p.performed_at) AS last_application,
          SUM(CASE WHEN p.had_intercurrence = 1 THEN 1 ELSE 0 END) AS intercurrences
        FROM procedures p
        LEFT JOIN protocols pr ON pr.id = p.protocol_id
        WHERE ${conditions.join(" AND ")}
        GROUP BY COALESCE(pr.name, 'Aplicacao avulsa')
        ORDER BY applications DESC, protocol ASC
      `,
      params
    );

    return buildReport("Aplicacoes por Protocolo", periodSubtitle(filter), [
      { key: "protocol", label: "Protocolo" },
      { key: "applications", label: "Aplicacoes", align: "right" },
      { key: "patients", label: "Pacientes", align: "right" },
      { key: "first_application", label: "Primeira" },
      { key: "last_application", label: "Ultima" },
      { key: "intercurrences", label: "Intercorrencias", align: "right" },
    ], rows);
  },

  async getAuditLogReport(filter: ReportFilter): Promise<DetailedReportData> {
    const conditions = ["a.clinic_id = ?"];
    const params: unknown[] = [CLINIC_ID];
    addDateRange(conditions, params, "a.created_at", filter);
    if (filter.status) {
      conditions.push("a.entity_type = ?");
      params.push(filter.status);
    }

    const rows = await dbSelect<ReportRow>(
      `
        SELECT
          a.created_at AS date,
          COALESCE(u.name, 'Sistema') AS user,
          a.action AS action,
          COALESCE(a.entity_type, '-') AS entity,
          COALESCE(a.description, '-') AS description
        FROM audit_logs a
        LEFT JOIN users u ON u.id = a.user_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY a.created_at DESC
        LIMIT 500
      `,
      params
    );

    return buildReport("Auditoria do Sistema", `${periodSubtitle(filter)}. Limitado aos 500 registros mais recentes.`, [
      { key: "date", label: "Data" },
      { key: "user", label: "Usuario" },
      { key: "action", label: "Acao" },
      { key: "entity", label: "Entidade" },
      { key: "description", label: "Descricao" },
    ], rows);
  },

  async getLabelsGeneratedReport(filter: ReportFilter): Promise<DetailedReportData> {
    const conditions = ["j.clinic_id = ?"];
    const params: unknown[] = [CLINIC_ID];
    addDateRange(conditions, params, "j.created_at", filter);

    const rows = await dbSelect<ReportRow>(
      `
        SELECT
          j.created_at AS date,
          j.job_name AS job,
          j.source_type AS source,
          t.name AS template,
          j.total_labels AS labels,
          j.status AS status,
          COUNT(li.id) AS items
        FROM label_print_jobs j
        LEFT JOIN label_templates t ON t.id = j.template_id
        LEFT JOIN label_print_items li ON li.print_job_id = j.id
        WHERE ${conditions.join(" AND ")}
        GROUP BY j.id
        ORDER BY j.created_at DESC
      `,
      params
    );

    const report = buildReport("Etiquetas Geradas", periodSubtitle(filter), [
      { key: "date", label: "Data" },
      { key: "job", label: "Lote de Impressao" },
      { key: "source", label: "Origem" },
      { key: "template", label: "Modelo" },
      { key: "labels", label: "Etiquetas", align: "right" },
      { key: "items", label: "Itens", align: "right" },
      { key: "status", label: "Status" },
    ], rows);
    report.summary = [
      { label: "Trabalhos", value: rows.length, tone: "info" },
      {
        label: "Etiquetas",
        value: rows.reduce((total, row) => total + Number(row.labels || 0), 0),
        tone: "success",
      },
    ];
    return report;
  },
};
