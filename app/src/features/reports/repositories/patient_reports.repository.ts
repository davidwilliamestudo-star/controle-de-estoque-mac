import { dbSelect } from "@/lib/db/sqlite";
import type {
  DetailedReportData,
  PatientGeneralReportData,
  PatientHistoryRow,
  ReportFilter,
} from "../schemas/report.schema";
import {
  CLINIC_ID,
  ReportRow,
  addDateRange,
  addPatientFilter,
  buildReport,
  periodSubtitle,
} from "./reports.helpers";

export const patientReportsRepository = {
  async getPatientHistory(filter: ReportFilter): Promise<PatientHistoryRow[]> {
    const conditions = ["p.clinic_id = ?", "p.deleted_at IS NULL", "p.status = 'finalized'"];
    const params: unknown[] = [CLINIC_ID];
    addDateRange(conditions, params, "p.performed_at", filter);
    addPatientFilter(conditions, params, "p", filter);

    if (filter.medicationId || filter.materialId) {
      const itemId = filter.medicationId || filter.materialId;
      conditions.push("EXISTS (SELECT 1 FROM procedure_items_used piu WHERE piu.procedure_id = p.id AND piu.inventory_item_id = ?)");
      params.push(itemId);
    }

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

    if (filter.medicationId || filter.materialId) {
      const itemId = filter.medicationId || filter.materialId;
      conditions.push("EXISTS (SELECT 1 FROM procedure_items_used piu WHERE piu.procedure_id = p.id AND piu.inventory_item_id = ?)");
      params.push(itemId);
    }

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
};
