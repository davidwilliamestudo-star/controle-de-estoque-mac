import { dbSelect } from "@/lib/db/sqlite";
import type {
  DetailedReportData,
  ReportFilter,
  TraceabilityRow,
} from "../schemas/report.schema";
import {
  CLINIC_ID,
  ReportRow,
  addDateRange,
  addInventoryFilters,
  buildReport,
  periodSubtitle,
} from "./reports.helpers";

export const operationalReportsRepository = {
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
    if (filter.userId) {
      conditions.push("a.user_id = ?");
      params.push(filter.userId);
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

  async listUsers(): Promise<Array<{ id: string; name: string }>> {
    return dbSelect<{ id: string; name: string }>(`
      SELECT id, name FROM users WHERE deleted_at IS NULL AND is_active = 1 ORDER BY name ASC
    `);
  },
};
