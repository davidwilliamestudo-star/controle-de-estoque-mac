import { dbSelect } from "@/lib/db/sqlite";
import type { PatientProcedureHistoryItem, ProcedureItemUsedDetail } from "../schemas/patient.schema";

export const patientProcedureHistoryRepository = {
  /** Busca o histórico completo de procedimentos finalizados de um paciente */
  async getPatientProcedureHistory(patientId: string): Promise<PatientProcedureHistoryItem[]> {
    // 1. Fetch the procedures
    const procedures = await dbSelect<any>(`
      SELECT
        pr.id,
        pr.patient_id,
        pr.performed_at,
        pr.finalized_at,
        pr.status,
        pr.had_intercurrence,
        pr.intercurrence_description,
        pr.evolution_text,
        pr.notes,
        pr.appointment_id,
        pr.application_plan_id,
        pt.name AS protocol_name,
        ar.name AS route_name,
        COALESCE(ba.display_name, ba.name) AS body_area_name,
        COALESCE(ba.display_name, ba.name) AS body_area_technical_name,
        ba.slug AS body_area_slug,
        ba.svg_region_id AS body_area_svg_region_id,
        ba.route_code,
        ba.side AS body_area_side,
        ba.anatomical_region AS body_area_region,
        u.name AS professional_name
      FROM procedures pr
      LEFT JOIN protocols pt ON pt.id = pr.protocol_id
      LEFT JOIN body_areas ba ON ba.id = pr.body_area_id
      LEFT JOIN administration_routes ar ON ar.id = pt.administration_route_id
      LEFT JOIN users u ON u.id = pr.responsible_user_id
      WHERE pr.patient_id = ? AND pr.status = 'finalized' AND pr.deleted_at IS NULL
      ORDER BY pr.performed_at DESC
    `, [patientId]);

    if (procedures.length === 0) return [];

    const procedureIds = procedures.map(p => p.id);
    const placeholders = procedureIds.map(() => '?').join(',');

    // 2. Fetch all items used in these procedures
    const items = await dbSelect<any>(`
      SELECT
        piu.id,
        piu.procedure_id,
        piu.inventory_item_id,
        piu.inventory_batch_id,
        piu.item_type,
        piu.quantity_used,
        piu.unit,
        piu.is_corrected,
        ii.name AS item_name,
        ib.batch_number,
        ib.expiration_date,
        ib.unit_cost
      FROM procedure_items_used piu
      LEFT JOIN inventory_items ii ON ii.id = piu.inventory_item_id
      LEFT JOIN inventory_batches ib ON ib.id = piu.inventory_batch_id
      WHERE piu.procedure_id IN (${placeholders})
    `, procedureIds);

    // Group items by procedure_id
    const itemsByProcedureId = items.reduce((acc, item) => {
      if (!acc[item.procedure_id]) acc[item.procedure_id] = [];
      
      const unitCost = typeof item.unit_cost === 'number' ? item.unit_cost : null;
      const totalCost = unitCost !== null ? item.quantity_used * unitCost : null;

      acc[item.procedure_id].push({
        id: item.id,
        inventory_item_id: item.inventory_item_id,
        inventory_batch_id: item.inventory_batch_id,
        item_name: item.item_name,
        item_type: item.item_type,
        quantity_used: item.quantity_used,
        unit: item.unit,
        batch_number: item.batch_number,
        expiration_date: item.expiration_date,
        manufacture_date: null, // Note: no manufacture_date in DB currently
        is_corrected: item.is_corrected,
        unit_cost: unitCost,
        total_cost: totalCost
      });
      return acc;
    }, {} as Record<string, ProcedureItemUsedDetail[]>);

    // 3. Assemble the final array
    return procedures.map(p => {
      const procItems = itemsByProcedureId[p.id] || [];
      const totalProcedureCost = procItems.reduce((sum: number, i: ProcedureItemUsedDetail) => sum + (i.total_cost || 0), 0);
      
      return {
        ...p,
        items_used: procItems,
        total_procedure_cost: totalProcedureCost
      };
    });
  },

  /** Retorna todos os itens (medicamentos/materiais) já utilizados neste paciente */
  async getPatientUsedItems(patientId: string): Promise<any[]> {
    return dbSelect(`
      SELECT
        ii.id AS item_id,
        ii.name AS item_name,
        ii.item_type,
        SUM(piu.quantity_used) AS total_quantity,
        piu.unit,
        MAX(pr.performed_at) AS last_used_at,
        COUNT(DISTINCT pr.id) AS usage_count
      FROM procedure_items_used piu
      JOIN procedures pr ON pr.id = piu.procedure_id
      JOIN inventory_items ii ON ii.id = piu.inventory_item_id
      WHERE pr.patient_id = ? AND pr.status = 'finalized' AND pr.deleted_at IS NULL AND piu.is_corrected = 0
      GROUP BY ii.id, ii.name, ii.item_type, piu.unit
      ORDER BY last_used_at DESC
    `, [patientId]);
  },

  /** Retorna todos os lotes já utilizados neste paciente */
  async getPatientUsedBatches(patientId: string): Promise<any[]> {
    return dbSelect(`
      SELECT
        ib.id AS batch_id,
        ib.batch_number,
        ib.expiration_date,
        ii.name AS item_name,
        ii.item_type,
        SUM(piu.quantity_used) AS total_quantity_used,
        piu.unit,
        MAX(pr.performed_at) AS last_used_at,
        COUNT(DISTINCT pr.id) AS usage_count
      FROM procedure_items_used piu
      JOIN procedures pr ON pr.id = piu.procedure_id
      JOIN inventory_batches ib ON ib.id = piu.inventory_batch_id
      JOIN inventory_items ii ON ii.id = piu.inventory_item_id
      WHERE pr.patient_id = ? AND pr.status = 'finalized' AND pr.deleted_at IS NULL AND piu.is_corrected = 0
      GROUP BY ib.id, ib.batch_number, ib.expiration_date, ii.name, ii.item_type, piu.unit
      ORDER BY last_used_at DESC
    `, [patientId]);
  }
};
