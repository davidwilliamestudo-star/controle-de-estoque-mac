import { dbSelect } from "@/lib/db/sqlite";
import type {
  ConsumptionRow,
  DashboardKPIs,
  DetailedReportData,
  ReportFilter,
  StockMovementRow,
  StockPositionRow,
} from "../schemas/report.schema";
import {
  CLINIC_ID,
  ReportRow,
  addDateRange,
  addInventoryFilters,
  buildReport,
  itemTypeLabel,
  movementTypeLabels,
  periodSubtitle,
} from "./reports.helpers";

export const inventoryReportsRepository = {
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

    const [stockValue] = await dbSelect<{ total_value: number }>(
      `
        SELECT SUM(b.current_quantity * COALESCE(i.cost_price, 0)) as total_value
        FROM inventory_batches b
        JOIN inventory_items i ON i.id = b.inventory_item_id
        WHERE b.clinic_id = ? AND b.deleted_at IS NULL AND b.current_quantity > 0 AND i.deleted_at IS NULL
      `,
      [CLINIC_ID]
    );

    const [financialConsumption] = await dbSelect<{ total_value: number }>(
      `
        SELECT SUM(m.quantity * COALESCE(i.cost_price, 0)) as total_value
        FROM stock_movements m
        JOIN inventory_items i ON i.id = m.inventory_item_id
        WHERE m.clinic_id = ?
          AND m.movement_type IN ('exit', 'automatic_exit', 'loss', 'expired')
          AND date(m.movement_date) >= date('now', '-30 days')
      `,
      [CLINIC_ID]
    );

    const [expiredCount] = await dbSelect<{ count: number }>(
      `
        SELECT COUNT(*) as count
        FROM inventory_batches
        WHERE clinic_id = ?
          AND deleted_at IS NULL
          AND current_quantity > 0
          AND date(expiration_date) < date('now')
      `,
      [CLINIC_ID]
    );

    const [prevVolume] = await dbSelect<{ count: number }>(
      `
        SELECT COUNT(*) as count
        FROM procedures
        WHERE clinic_id = ?
          AND status = 'finalized'
          AND deleted_at IS NULL
          AND date(performed_at) >= date('now', '-60 days')
          AND date(performed_at) < date('now', '-30 days')
      `,
      [CLINIC_ID]
    );

    return {
      totalActiveProducts: activeProducts?.count || 0,
      lowStockItems: stockHealth?.low_stock || 0,
      expiringBatches: stockHealth?.expiring || 0,
      totalProcedures30Days: volume?.count || 0,
      estimatedStockValue: stockValue?.total_value || 0,
      financialConsumption30Days: financialConsumption?.total_value || 0,
      criticalAlertsCount: expiredCount?.count || 0,
      proceduresCompletedCount: volume?.count || 0,
      previousProceduresCount: prevVolume?.count || 0,
    };
  },

  async getStockPosition(filter: ReportFilter): Promise<StockPositionRow[]> {
    const conditions = ["i.clinic_id = ?", "i.deleted_at IS NULL"];
    const params: unknown[] = [CLINIC_ID];
    addInventoryFilters(conditions, params, filter);

    if (filter.supplierId) {
      conditions.push("(i.supplier_id = ? OR b.supplier_id = ?)");
      params.push(filter.supplierId, filter.supplierId);
    }

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

    if (filter.supplierId) {
      conditions.push("b.supplier_id = ?");
      params.push(filter.supplierId);
    }
    if (filter.userId) {
      conditions.push("m.user_id = ?");
      params.push(filter.userId);
    }

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

    if (filter.supplierId) {
      conditions.push("b.supplier_id = ?");
      params.push(filter.supplierId);
    }

    return dbSelect<ConsumptionRow>(
      `
        SELECT
          i.id AS item_id,
          i.name AS item_name,
          m.unit AS control_unit,
          SUM(m.quantity) AS total_consumed
        FROM stock_movements m
        JOIN inventory_items i ON i.id = m.inventory_item_id
        LEFT JOIN inventory_batches b ON b.id = m.inventory_batch_id
        WHERE ${conditions.join(" AND ")}
        GROUP BY i.id, m.unit
        ORDER BY total_consumed DESC
      `,
      params
    );
  },

  async getStockLowReport(filter: ReportFilter): Promise<DetailedReportData> {
    const rows = (await this.getStockPosition(filter))
      .filter((item) => Number(item.current_stock) < Number(item.minimum_stock))
      .map((item) => ({
        item: item.item_name,
        type: itemTypeLabel[item.item_type] || item.item_type,
        category: item.category_name,
        current_stock: item.current_stock,
        minimum_stock: item.minimum_stock,
        missing: Math.max(Number(item.minimum_stock) - Number(item.current_stock), 0),
        unit: item.control_unit,
        active_batches: item.active_batches,
      }));

    const report = buildReport(
      "Estoque Baixo",
      "Itens com saldo abaixo do minimo cadastrado.",
      [
        { key: "item", label: "Item" },
        { key: "type", label: "Tipo" },
        { key: "category", label: "Categoria" },
        { key: "current_stock", label: "Saldo", align: "right" },
        { key: "minimum_stock", label: "Minimo", align: "right" },
        { key: "missing", label: "Falta", align: "right" },
        { key: "unit", label: "Un.", align: "center" },
        { key: "active_batches", label: "Lotes", align: "right" },
      ],
      rows
    );
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

    if (filter.supplierId) {
      conditions.push("b.supplier_id = ?");
      params.push(filter.supplierId);
    }

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
    const rows = (await this.getStockMovements(filter)).map((move) => ({
      date: move.created_at,
      type: movementTypeLabels[move.movement_type] || move.movement_type,
      item: move.item_name,
      batch: move.batch_number,
      quantity: move.control_quantity,
      unit: move.control_unit,
      reason: move.reason,
    }));

    return buildReport(
      title,
      periodSubtitle(filter),
      [
        { key: "date", label: "Data" },
        { key: "type", label: "Tipo" },
        { key: "item", label: "Item" },
        { key: "batch", label: "Lote" },
        { key: "quantity", label: "Qtd.", align: "right" },
        { key: "unit", label: "Un.", align: "center" },
        { key: "reason", label: "Motivo" },
      ],
      rows
    );
  },

  async getTopConsumedProductsReport(filter: ReportFilter): Promise<DetailedReportData> {
    const conditions = [
      "m.clinic_id = ?",
      "m.movement_type IN ('exit', 'automatic_exit', 'loss', 'expired')"
    ];
    const params: unknown[] = [CLINIC_ID];
    addDateRange(conditions, params, "m.movement_date", filter);
    addInventoryFilters(conditions, params, filter);

    if (filter.supplierId) {
      conditions.push("b.supplier_id = ?");
      params.push(filter.supplierId);
    }

    const rows = await dbSelect<ReportRow>(
      `
        SELECT
          i.name AS item,
          c.name AS category,
          i.unit AS unit,
          SUM(m.quantity) AS total_consumed,
          SUM(m.quantity * COALESCE(i.cost_price, 0)) AS total_cost
        FROM stock_movements m
        JOIN inventory_items i ON i.id = m.inventory_item_id
        LEFT JOIN inventory_categories c ON c.id = i.category_id
        LEFT JOIN inventory_batches b ON b.id = m.inventory_batch_id
        WHERE ${conditions.join(" AND ")}
        GROUP BY i.id
        ORDER BY total_consumed DESC
        LIMIT 50
      `,
      params
    );

    return buildReport(
      "Produtos Mais Utilizados (Top 50)",
      periodSubtitle(filter),
      [
        { key: "item", label: "Produto" },
        { key: "category", label: "Categoria" },
        { key: "total_consumed", label: "Volume Consumido", align: "right" },
        { key: "unit", label: "Unidade", align: "center" },
        { key: "total_cost", label: "Custo Estimado (R$)", align: "right" },
      ],
      rows
    );
  },

  async getStockForecastingReport(filter: ReportFilter): Promise<DetailedReportData> {
    // Para previsao, vamos olhar os ultimos 90 dias ou o filtro providenciado
    const conditions = [
      "m.clinic_id = ?",
      "m.movement_type IN ('exit', 'automatic_exit')"
    ];
    const params: unknown[] = [CLINIC_ID];
    
    if (filter.startDate) {
      conditions.push("date(m.movement_date) >= date(?)");
      params.push(filter.startDate);
    } else {
      conditions.push("date(m.movement_date) >= date('now', '-90 days')");
    }
    
    if (filter.endDate) {
      conditions.push("date(m.movement_date) <= date(?)");
      params.push(filter.endDate);
    }

    if (filter.supplierId) {
      conditions.push("(i.supplier_id = ? OR EXISTS (SELECT 1 FROM inventory_batches ib WHERE ib.inventory_item_id = i.id AND ib.supplier_id = ? AND ib.deleted_at IS NULL))");
      params.push(filter.supplierId, filter.supplierId);
    }

    // CTE (Common Table Expression) via subquery (SQLite limits sometimes)
    // 1. Calcula consumo medio diario por item (total / 90 dias)
    // 2. Compara com estoque atual
    const rows = await dbSelect<ReportRow>(
      `
        SELECT
          i.name AS item,
          i.unit AS unit,
          i.minimum_stock,
          COALESCE((SELECT SUM(current_quantity) FROM inventory_batches b WHERE b.inventory_item_id = i.id AND b.deleted_at IS NULL), 0) AS current_stock,
          COALESCE(SUM(m.quantity) / MAX(1, CAST((julianday(COALESCE(MAX(m.movement_date), date('now'))) - julianday(COALESCE(MIN(m.movement_date), date('now', '-90 days')))) AS INTEGER)), 0) AS avg_daily_consumption
        FROM inventory_items i
        LEFT JOIN stock_movements m ON m.inventory_item_id = i.id AND ${conditions.join(" AND ")}
        WHERE i.clinic_id = '${CLINIC_ID}' AND i.deleted_at IS NULL AND i.is_active = 1
        GROUP BY i.id
        HAVING current_stock > 0 AND avg_daily_consumption > 0
        ORDER BY (current_stock / avg_daily_consumption) ASC
      `,
      params
    );

    const formattedRows = rows.map(r => {
      const daily = Number(r.avg_daily_consumption) || 0.001; // prevent div by zero
      const stock = Number(r.current_stock) || 0;
      const daysLeft = Math.floor(stock / daily);
      return {
        item: r.item,
        unit: r.unit,
        current_stock: stock,
        daily_consumption: daily.toFixed(2),
        days_left: daysLeft,
        status: daysLeft < 15 ? "Critico" : daysLeft < 30 ? "Alerta" : "Normal"
      };
    });

    return buildReport(
      "Previsão de Ruptura de Estoque",
      "Calculado com base no consumo médio do período.",
      [
        { key: "item", label: "Produto" },
        { key: "current_stock", label: "Estoque Atual", align: "right" },
        { key: "unit", label: "Unidade", align: "center" },
        { key: "daily_consumption", label: "Consumo/Dia", align: "right" },
        { key: "days_left", label: "Dias Restantes", align: "right" },
        { key: "status", label: "Status", align: "center" },
      ],
      formattedRows
    );
  },
};
