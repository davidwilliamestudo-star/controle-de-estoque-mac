import { dbSelect } from "@/lib/db/sqlite";
import type {
  ChartDatum,
  DashboardActivity,
  DashboardAlert,
  DashboardPeriod,
  DashboardSummaryRow,
} from "../types/dashboard.types";

const CLINIC_ID = "ana-morong-clinic";

function numberValue(value: unknown): number {
  return Number(value ?? 0);
}

function mapChartRows(rows: Array<{ name: string; value: unknown; secondaryValue?: unknown }>): ChartDatum[] {
  return rows.map(row => ({
    name: row.name,
    value: numberValue(row.value),
    secondaryValue: row.secondaryValue === undefined ? undefined : numberValue(row.secondaryValue),
  }));
}

export const dashboardRepository = {
  async getSummary(period: DashboardPeriod): Promise<DashboardSummaryRow> {
    const rows = await dbSelect<DashboardSummaryRow>(`
      SELECT
        (SELECT COUNT(*) FROM patients WHERE clinic_id = ? AND deleted_at IS NULL AND is_active = 1) AS active_patients,
        (SELECT COUNT(*) FROM patients WHERE clinic_id = ? AND deleted_at IS NULL AND is_active = 0) AS inactive_patients,
        (SELECT COUNT(*) FROM patients WHERE clinic_id = ? AND deleted_at IS NULL AND date(created_at) BETWEEN date(?) AND date(?)) AS new_patients,
        (SELECT COUNT(*) FROM procedures WHERE clinic_id = ? AND deleted_at IS NULL AND date(performed_at) BETWEEN date(?) AND date(?)) AS procedures_total,
        (SELECT COUNT(*) FROM procedures WHERE clinic_id = ? AND deleted_at IS NULL AND date(performed_at) = date('now')) AS procedures_today,
        (SELECT COUNT(*) FROM procedures WHERE clinic_id = ? AND deleted_at IS NULL AND status IN ('draft','ready_to_finalize')) AS pending_procedures,
        (SELECT COUNT(*) FROM protocols WHERE clinic_id = ? AND deleted_at IS NULL AND is_active = 1) AS active_protocols,
        (SELECT COUNT(*) FROM inventory_items WHERE clinic_id = ? AND deleted_at IS NULL AND is_active = 1) AS inventory_items,
        (SELECT COUNT(*) FROM inventory_items WHERE clinic_id = ? AND deleted_at IS NULL AND is_active = 1 AND minimum_stock > 0 AND current_stock > 0 AND current_stock <= minimum_stock) AS low_stock_items,
        (SELECT COUNT(*) FROM inventory_items WHERE clinic_id = ? AND deleted_at IS NULL AND is_active = 1 AND current_stock <= 0) AS out_stock_items,
        (SELECT COUNT(*) FROM inventory_batches WHERE clinic_id = ? AND deleted_at IS NULL AND current_quantity > 0 AND expiration_date IS NOT NULL AND date(expiration_date) < date('now')) AS expired_batches,
        (SELECT COUNT(*) FROM inventory_batches WHERE clinic_id = ? AND deleted_at IS NULL AND current_quantity > 0 AND expiration_date IS NOT NULL AND date(expiration_date) BETWEEN date('now') AND date('now', '+30 days')) AS expiring_batches,
        (SELECT COALESCE(SUM(total_labels), 0) FROM label_print_jobs WHERE clinic_id = ? AND date(created_at) BETWEEN date(?) AND date(?)) AS labels_generated,
        (SELECT COUNT(*) FROM appointments WHERE clinic_id = ? AND deleted_at IS NULL AND sync_status = 'failed') AS sync_failures
    `, [
      CLINIC_ID,
      CLINIC_ID,
      CLINIC_ID, period.startDate, period.endDate,
      CLINIC_ID, period.startDate, period.endDate,
      CLINIC_ID,
      CLINIC_ID,
      CLINIC_ID,
      CLINIC_ID,
      CLINIC_ID,
      CLINIC_ID,
      CLINIC_ID,
      CLINIC_ID,
      CLINIC_ID, period.startDate, period.endDate,
      CLINIC_ID,
    ]);

    const row = rows[0] ?? {};
    return {
      active_patients: numberValue(row.active_patients),
      inactive_patients: numberValue(row.inactive_patients),
      new_patients: numberValue(row.new_patients),
      procedures_total: numberValue(row.procedures_total),
      procedures_today: numberValue(row.procedures_today),
      pending_procedures: numberValue(row.pending_procedures),
      active_protocols: numberValue(row.active_protocols),
      inventory_items: numberValue(row.inventory_items),
      low_stock_items: numberValue(row.low_stock_items),
      out_stock_items: numberValue(row.out_stock_items),
      expired_batches: numberValue(row.expired_batches),
      expiring_batches: numberValue(row.expiring_batches),
      labels_generated: numberValue(row.labels_generated),
      sync_failures: numberValue(row.sync_failures),
    };
  },

  async getProcedureTrend(period: DashboardPeriod): Promise<ChartDatum[]> {
    const rows = await dbSelect<{ name: string; value: number }>(`
      SELECT strftime('%d/%m', performed_at) AS name, COUNT(*) AS value
      FROM procedures
      WHERE clinic_id = ? AND deleted_at IS NULL AND date(performed_at) BETWEEN date(?) AND date(?)
      GROUP BY date(performed_at)
      ORDER BY date(performed_at) ASC
    `, [CLINIC_ID, period.startDate, period.endDate]);
    return mapChartRows(rows);
  },

  async getConsumptionByType(period: DashboardPeriod): Promise<ChartDatum[]> {
    const rows = await dbSelect<{ name: string; value: number }>(`
      SELECT
        CASE piu.item_type
          WHEN 'medication' THEN 'Medicamentos'
          WHEN 'material' THEN 'Materiais'
          WHEN 'equipment' THEN 'Equipamentos'
          ELSE 'Outros'
        END AS name,
        COALESCE(SUM(piu.quantity_used), 0) AS value
      FROM procedure_items_used piu
      JOIN procedures p ON p.id = piu.procedure_id
      WHERE piu.clinic_id = ?
        AND p.deleted_at IS NULL
        AND date(p.performed_at) BETWEEN date(?) AND date(?)
      GROUP BY piu.item_type
      ORDER BY value DESC
    `, [CLINIC_ID, period.startDate, period.endDate]);
    return mapChartRows(rows);
  },

  async getTopProtocols(period: DashboardPeriod): Promise<ChartDatum[]> {
    const rows = await dbSelect<{ name: string; value: number }>(`
      SELECT COALESCE(pr.name, 'Sem protocolo') AS name, COUNT(*) AS value
      FROM procedures p
      LEFT JOIN protocols pr ON pr.id = p.protocol_id
      WHERE p.clinic_id = ? AND p.deleted_at IS NULL AND date(p.performed_at) BETWEEN date(?) AND date(?)
      GROUP BY COALESCE(pr.name, 'Sem protocolo')
      ORDER BY value DESC, name ASC
      LIMIT 5
    `, [CLINIC_ID, period.startDate, period.endDate]);
    return mapChartRows(rows);
  },

  async getRouteDistribution(period: DashboardPeriod): Promise<ChartDatum[]> {
    const rows = await dbSelect<{ name: string; value: number }>(`
      SELECT COALESCE(ar.name, 'Sem rota') AS name, COUNT(*) AS value
      FROM procedures p
      LEFT JOIN protocols pr ON pr.id = p.protocol_id
      LEFT JOIN administration_routes ar ON ar.id = pr.administration_route_id
      WHERE p.clinic_id = ? AND p.deleted_at IS NULL AND date(p.performed_at) BETWEEN date(?) AND date(?)
      GROUP BY COALESCE(ar.name, 'Sem rota')
      ORDER BY value DESC
      LIMIT 6
    `, [CLINIC_ID, period.startDate, period.endDate]);
    return mapChartRows(rows);
  },

  async getStockByCategory(): Promise<ChartDatum[]> {
    const rows = await dbSelect<{ name: string; value: number }>(`
      SELECT COALESCE(c.name, 'Sem categoria') AS name, COUNT(i.id) AS value
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON c.id = i.category_id
      WHERE i.clinic_id = ? AND i.deleted_at IS NULL AND i.is_active = 1
      GROUP BY COALESCE(c.name, 'Sem categoria')
      ORDER BY value DESC, name ASC
      LIMIT 8
    `, [CLINIC_ID]);
    return mapChartRows(rows);
  },

  async getExpirationBuckets(): Promise<ChartDatum[]> {
    const rows = await dbSelect<{ name: string; value: number }>(`
      SELECT bucket AS name, COUNT(*) AS value
      FROM (
        SELECT
          CASE
            WHEN expiration_date IS NULL THEN 'Sem validade'
            WHEN date(expiration_date) < date('now') THEN 'Vencidos'
            WHEN date(expiration_date) <= date('now', '+30 days') THEN 'Ate 30 dias'
            WHEN date(expiration_date) <= date('now', '+90 days') THEN '31 a 90 dias'
            ELSE 'Mais de 90 dias'
          END AS bucket
        FROM inventory_batches
        WHERE clinic_id = ? AND deleted_at IS NULL AND current_quantity > 0
      )
      GROUP BY bucket
      ORDER BY
        CASE bucket
          WHEN 'Vencidos' THEN 1
          WHEN 'Ate 30 dias' THEN 2
          WHEN '31 a 90 dias' THEN 3
          WHEN 'Mais de 90 dias' THEN 4
          ELSE 5
        END
    `, [CLINIC_ID]);
    return mapChartRows(rows);
  },

  async getAlertsBySeverity(): Promise<ChartDatum[]> {
    const rows = await dbSelect<{ name: string; value: number }>(`
      SELECT
        CASE severity
          WHEN 'critical' THEN 'Criticos'
          WHEN 'high' THEN 'Altos'
          WHEN 'medium' THEN 'Medios'
          WHEN 'low' THEN 'Baixos'
          ELSE 'Informativos'
        END AS name,
        COUNT(*) AS value
      FROM notifications
      WHERE clinic_id = ? AND deleted_at IS NULL AND status IN ('unread','read')
      GROUP BY severity
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END
    `, [CLINIC_ID]);
    return mapChartRows(rows);
  },

  async getRecentActivity(limit = 8): Promise<DashboardActivity[]> {
    return dbSelect<DashboardActivity>(`
      SELECT
        id,
        action,
        COALESCE(description, action) AS description,
        entity_type AS entityType,
        entity_id AS entityId,
        created_at AS createdAt
      FROM audit_logs
      WHERE clinic_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [CLINIC_ID, limit]);
  },

  async getOperationalAlerts(limit = 8): Promise<DashboardAlert[]> {
    return dbSelect<DashboardAlert>(`
      SELECT
        id,
        title,
        message,
        severity,
        entity_type AS entityType,
        entity_id AS entityId,
        action_url AS actionUrl,
        created_at AS createdAt
      FROM notifications
      WHERE clinic_id = ? AND deleted_at IS NULL AND status IN ('unread','read')
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        created_at DESC
      LIMIT ?
    `, [CLINIC_ID, limit]);
  },
};
