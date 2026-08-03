import { dbSelect } from "@/lib/db/sqlite";
import { CLINIC_ID } from "@/features/inventory/types";
import { classifyMaterial, isSyringeKind, kindLabel, monthBounds } from "../lib/materialClassifier";
import type {
  MonthlyMaterialRow,
  MonthlyProtocolRow,
  MonthlySummary,
  PatientMonthlyCost,
  PatientMonthlyCostLine,
  ProtocolSetupFlags,
} from "../types";

/** Expressão SQL de custo unitário (lote → último lote com custo → cost_price do item). */
const UNIT_COST_SQL = `
  COALESCE(
    ib.unit_cost,
    (
      SELECT b2.unit_cost
      FROM inventory_batches b2
      WHERE b2.inventory_item_id = piu.inventory_item_id
        AND b2.unit_cost IS NOT NULL AND b2.unit_cost > 0
        AND b2.deleted_at IS NULL
      ORDER BY b2.created_at DESC
      LIMIT 1
    ),
    i.cost_price,
    0
  )
`;

interface RawMaterialRow {
  item_id: string;
  item_name: string;
  item_type: string;
  category_name: string | null;
  unit: string;
  total_qty: number;
  total_cost: number;
}

function mapMaterialRows(rows: RawMaterialRow[]): MonthlyMaterialRow[] {
  return rows.map((r) => ({
    itemId: r.item_id,
    itemName: r.item_name,
    itemType: r.item_type,
    categoryName: r.category_name,
    unit: r.unit || "un",
    kind: classifyMaterial(r.item_name, r.category_name, r.item_type),
    totalQty: Number(r.total_qty) || 0,
    totalCost: Number(r.total_cost) || 0,
  }));
}

export const monthlySummaryRepository = {
  async getConsumedMaterials(startDate: string, endDate: string, patientId?: string): Promise<MonthlyMaterialRow[]> {
    const params: unknown[] = [CLINIC_ID, startDate, endDate];
    let patientClause = "";
    if (patientId) {
      patientClause = " AND p.patient_id = ? ";
      params.push(patientId);
    }

    const rows = await dbSelect<RawMaterialRow>(
      `
      SELECT
        i.id AS item_id,
        i.name AS item_name,
        i.item_type,
        c.name AS category_name,
        COALESCE(piu.unit, i.unit, 'un') AS unit,
        SUM(piu.quantity_used) AS total_qty,
        SUM(piu.quantity_used * (${UNIT_COST_SQL})) AS total_cost
      FROM procedure_items_used piu
      JOIN procedures p ON p.id = piu.procedure_id
      JOIN inventory_items i ON i.id = piu.inventory_item_id
      LEFT JOIN inventory_categories c ON c.id = i.category_id
      LEFT JOIN inventory_batches ib ON ib.id = piu.inventory_batch_id
      WHERE p.clinic_id = ?
        AND p.status = 'finalized'
        AND p.deleted_at IS NULL
        AND COALESCE(piu.is_corrected, 0) = 0
        AND date(COALESCE(p.finalized_at, p.performed_at)) >= date(?)
        AND date(COALESCE(p.finalized_at, p.performed_at)) <= date(?)
        ${patientClause}
      GROUP BY i.id
      ORDER BY total_qty DESC
      `,
      params,
    );

    return mapMaterialRows(rows);
  },

  async getProtocolBreakdown(startDate: string, endDate: string): Promise<MonthlyProtocolRow[]> {
    // Prefer applications when present; fallback to procedure.protocol_id
    const fromApps = await dbSelect<{
      protocol_id: string | null;
      protocol_name: string;
      applications_count: number;
      procedures_count: number;
    }>(
      `
      SELECT
        pa.protocol_id,
        COALESCE(prot.name, 'Sem protocolo') AS protocol_name,
        COUNT(pa.id) AS applications_count,
        COUNT(DISTINCT p.id) AS procedures_count
      FROM procedure_applications pa
      JOIN procedures p ON p.id = pa.procedure_id
      LEFT JOIN protocols prot ON prot.id = pa.protocol_id
      WHERE p.clinic_id = ?
        AND p.status = 'finalized'
        AND p.deleted_at IS NULL
        AND date(COALESCE(p.finalized_at, p.performed_at)) >= date(?)
        AND date(COALESCE(p.finalized_at, p.performed_at)) <= date(?)
      GROUP BY pa.protocol_id
      ORDER BY applications_count DESC
      `,
      [CLINIC_ID, startDate, endDate],
    );

    if (fromApps.length > 0) {
      return fromApps.map((r) => ({
        protocolId: r.protocol_id,
        protocolName: r.protocol_name,
        applicationsCount: Number(r.applications_count) || 0,
        proceduresCount: Number(r.procedures_count) || 0,
      }));
    }

    const fromProcedures = await dbSelect<{
      protocol_id: string | null;
      protocol_name: string;
      procedures_count: number;
    }>(
      `
      SELECT
        p.protocol_id,
        COALESCE(prot.name, 'Sem protocolo') AS protocol_name,
        COUNT(p.id) AS procedures_count
      FROM procedures p
      LEFT JOIN protocols prot ON prot.id = p.protocol_id
      WHERE p.clinic_id = ?
        AND p.status = 'finalized'
        AND p.deleted_at IS NULL
        AND date(COALESCE(p.finalized_at, p.performed_at)) >= date(?)
        AND date(COALESCE(p.finalized_at, p.performed_at)) <= date(?)
      GROUP BY p.protocol_id
      ORDER BY procedures_count DESC
      `,
      [CLINIC_ID, startDate, endDate],
    );

    return fromProcedures.map((r) => ({
      protocolId: r.protocol_id,
      protocolName: r.protocol_name,
      applicationsCount: Number(r.procedures_count) || 0,
      proceduresCount: Number(r.procedures_count) || 0,
    }));
  },

  async getProcedureCounts(startDate: string, endDate: string, patientId?: string): Promise<{
    proceduresCount: number;
    protocolApplicationsCount: number;
  }> {
    const params: unknown[] = [CLINIC_ID, startDate, endDate];
    let patientClause = "";
    if (patientId) {
      patientClause = " AND p.patient_id = ? ";
      params.push(patientId);
    }

    const [procRow] = await dbSelect<{ count: number }>(
      `
      SELECT COUNT(*) AS count
      FROM procedures p
      WHERE p.clinic_id = ?
        AND p.status = 'finalized'
        AND p.deleted_at IS NULL
        AND date(COALESCE(p.finalized_at, p.performed_at)) >= date(?)
        AND date(COALESCE(p.finalized_at, p.performed_at)) <= date(?)
        ${patientClause}
      `,
      params,
    );

    const appParams: unknown[] = [CLINIC_ID, startDate, endDate];
    let appPatientClause = "";
    if (patientId) {
      appPatientClause = " AND p.patient_id = ? ";
      appParams.push(patientId);
    }

    const [appRow] = await dbSelect<{ count: number }>(
      `
      SELECT COUNT(pa.id) AS count
      FROM procedure_applications pa
      JOIN procedures p ON p.id = pa.procedure_id
      WHERE p.clinic_id = ?
        AND p.status = 'finalized'
        AND p.deleted_at IS NULL
        AND pa.protocol_id IS NOT NULL
        AND date(COALESCE(p.finalized_at, p.performed_at)) >= date(?)
        AND date(COALESCE(p.finalized_at, p.performed_at)) <= date(?)
        ${appPatientClause}
      `,
      appParams,
    );

    const proceduresCount = Number(procRow?.count) || 0;
    let protocolApplicationsCount = Number(appRow?.count) || 0;

    // Fallback: se não houver applications, conta procedures com protocol_id
    if (protocolApplicationsCount === 0 && proceduresCount > 0) {
      const fallbackParams: unknown[] = [CLINIC_ID, startDate, endDate];
      let fbPatient = "";
      if (patientId) {
        fbPatient = " AND p.patient_id = ? ";
        fallbackParams.push(patientId);
      }
      const [fb] = await dbSelect<{ count: number }>(
        `
        SELECT COUNT(*) AS count
        FROM procedures p
        WHERE p.clinic_id = ?
          AND p.status = 'finalized'
          AND p.deleted_at IS NULL
          AND p.protocol_id IS NOT NULL
          AND date(COALESCE(p.finalized_at, p.performed_at)) >= date(?)
          AND date(COALESCE(p.finalized_at, p.performed_at)) <= date(?)
          ${fbPatient}
        `,
        fallbackParams,
      );
      protocolApplicationsCount = Number(fb?.count) || 0;
    }

    return { proceduresCount, protocolApplicationsCount };
  },

  async getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
    const { startDate, endDate } = monthBounds(year, month);
    const [materials, byProtocol, counts] = await Promise.all([
      this.getConsumedMaterials(startDate, endDate),
      this.getProtocolBreakdown(startDate, endDate),
      this.getProcedureCounts(startDate, endDate),
    ]);

    const syringes = { ml3: 0, ml5: 0, ml10: 0, other: 0 };
    let needlesCount = 0;
    let cottonCount = 0;
    let alcoholCount = 0;
    let totalCost = 0;
    let medicationCost = 0;
    let materialCost = 0;
    const otherMaterials: MonthlySummary["otherMaterials"] = [];

    for (const m of materials) {
      totalCost += m.totalCost;
      if (m.kind === "medication") {
        medicationCost += m.totalCost;
        continue;
      }
      materialCost += m.totalCost;

      switch (m.kind) {
        case "syringe_3ml":
          syringes.ml3 += m.totalQty;
          break;
        case "syringe_5ml":
          syringes.ml5 += m.totalQty;
          break;
        case "syringe_10ml":
          syringes.ml10 += m.totalQty;
          break;
        case "syringe_other":
          syringes.other += m.totalQty;
          break;
        case "needle":
          needlesCount += m.totalQty;
          break;
        case "cotton":
          cottonCount += m.totalQty;
          break;
        case "alcohol":
          alcoholCount += m.totalQty;
          break;
        default:
          otherMaterials.push({
            name: m.itemName,
            qty: m.totalQty,
            unit: m.unit,
            cost: m.totalCost,
          });
      }
    }

    return {
      startDate,
      endDate,
      year,
      month,
      proceduresCount: counts.proceduresCount,
      protocolApplicationsCount: counts.protocolApplicationsCount,
      syringes,
      needlesCount,
      cottonCount,
      alcoholCount,
      otherMaterials,
      totalCost,
      medicationCost,
      materialCost,
      materials,
      byProtocol,
    };
  },

  async getPatientMonthlyCost(
    patientId: string,
    year: number,
    month: number,
  ): Promise<PatientMonthlyCost | null> {
    const { startDate, endDate } = monthBounds(year, month);

    const [patientRows, materials, counts, protocols] = await Promise.all([
      dbSelect<{ id: string; full_name: string }>(
        `SELECT id, full_name FROM patients WHERE id = ? AND deleted_at IS NULL`,
        [patientId],
      ),
      this.getConsumedMaterials(startDate, endDate, patientId),
      this.getProcedureCounts(startDate, endDate, patientId),
      dbSelect<{ protocol_name: string }>(
        `
        SELECT DISTINCT COALESCE(prot.name, proc_prot.name, 'Sem protocolo') AS protocol_name
        FROM procedures p
        LEFT JOIN procedure_applications pa ON pa.procedure_id = p.id
        LEFT JOIN protocols prot ON prot.id = pa.protocol_id
        LEFT JOIN protocols proc_prot ON proc_prot.id = p.protocol_id
        WHERE p.patient_id = ?
          AND p.clinic_id = ?
          AND p.status = 'finalized'
          AND p.deleted_at IS NULL
          AND date(COALESCE(p.finalized_at, p.performed_at)) >= date(?)
          AND date(COALESCE(p.finalized_at, p.performed_at)) <= date(?)
        `,
        [patientId, CLINIC_ID, startDate, endDate],
      ),
    ]);

    if (!patientRows[0]) return null;

    let medicationCost = 0;
    let syringesCost = 0;
    let needlesCost = 0;
    let otherMaterialsCost = 0;
    let totalCost = 0;

    const lines: PatientMonthlyCostLine[] = [];

    for (const m of materials) {
      totalCost += m.totalCost;
      if (m.kind === "medication") {
        medicationCost += m.totalCost;
        lines.push({
          kind: m.kind,
          label: m.itemName,
          qty: m.totalQty,
          unit: m.unit,
          cost: m.totalCost,
        });
      } else if (isSyringeKind(m.kind)) {
        syringesCost += m.totalCost;
        lines.push({
          kind: m.kind,
          label: kindLabel(m.kind) + (m.itemName ? ` (${m.itemName})` : ""),
          qty: m.totalQty,
          unit: m.unit,
          cost: m.totalCost,
        });
      } else if (m.kind === "needle") {
        needlesCost += m.totalCost;
        lines.push({
          kind: m.kind,
          label: m.itemName,
          qty: m.totalQty,
          unit: m.unit,
          cost: m.totalCost,
        });
      } else {
        otherMaterialsCost += m.totalCost;
        lines.push({
          kind: m.kind,
          label: m.itemName,
          qty: m.totalQty,
          unit: m.unit,
          cost: m.totalCost,
        });
      }
    }

    return {
      patientId,
      patientName: patientRows[0].full_name,
      startDate,
      endDate,
      year,
      month,
      proceduresCount: counts.proceduresCount,
      protocolApplicationsCount: counts.protocolApplicationsCount,
      protocolNames: protocols.map((p) => p.protocol_name).filter(Boolean),
      medicationCost,
      syringesCost,
      needlesCost,
      otherMaterialsCost,
      totalCost,
      lines,
      details: materials,
    };
  },

  async getProtocolSetupFlags(protocolIds: string[]): Promise<Record<string, ProtocolSetupFlags>> {
    if (protocolIds.length === 0) return {};

    const placeholders = protocolIds.map(() => "?").join(",");
    const rows = await dbSelect<{
      protocol_id: string;
      item_name: string;
      item_role: string;
      category_name: string | null;
    }>(
      `
      SELECT
        pi.protocol_id,
        i.name AS item_name,
        pi.item_role,
        c.name AS category_name
      FROM protocol_items pi
      JOIN inventory_items i ON i.id = pi.inventory_item_id
      LEFT JOIN inventory_categories c ON c.id = i.category_id
      WHERE pi.protocol_id IN (${placeholders})
        AND pi.deleted_at IS NULL
      `,
      protocolIds,
    );

    const result: Record<string, ProtocolSetupFlags> = {};
    for (const id of protocolIds) {
      result[id] = { hasSyringe: false, hasNeedle: false, materialCount: 0, medicationCount: 0 };
    }

    for (const row of rows) {
      const flags = result[row.protocol_id];
      if (!flags) continue;
      const kind = classifyMaterial(row.item_name, row.category_name, row.item_role);
      if (kind === "medication") {
        flags.medicationCount += 1;
      } else {
        flags.materialCount += 1;
      }
      if (isSyringeKind(kind)) flags.hasSyringe = true;
      if (kind === "needle") flags.hasNeedle = true;
    }

    return result;
  },
};
