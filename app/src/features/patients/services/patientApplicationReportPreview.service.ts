import { dbSelect } from "@/lib/db/sqlite";
import type { ReportData } from "@/features/integrations/apps-script/utils/reportEmailTemplates";

export const patientApplicationReportPreviewService = {
  async getPreview(input: {
    patientName: string;
    patientEmail?: string;
    selectedPlanIds: string[];
  }): Promise<Partial<ReportData>> {
    if (input.selectedPlanIds.length === 0) {
      return {
        patientName: input.patientName,
        patientEmail: input.patientEmail || "",
        clinicName: "Dra. Ana Morong",
        applications: [],
      };
    }

    const inClause = input.selectedPlanIds.map(() => "?").join(",");
    const procedures = await dbSelect<any>(`
      SELECT 
        p.id as procedure_id,
        p.finalized_at,
        p.evolution_text as final_evolution,
        p.intercurrence_description,
        pr.name as protocol_name,
        r.name as route_name,
        COALESCE(ba.display_name, ba.name) as body_area_name,
        prof.name as professional_name
      FROM procedures p
      INNER JOIN patient_application_plans pap ON pap.id = p.application_plan_id
      LEFT JOIN protocols pr ON pr.id = pap.protocol_id
      LEFT JOIN administration_routes r ON r.id = pap.route_id
      LEFT JOIN body_areas ba ON ba.id = p.body_area_id
      LEFT JOIN users prof ON prof.id = p.responsible_user_id
      WHERE pap.id IN (${inClause}) AND p.status = 'finalized'
      ORDER BY p.finalized_at DESC
    `, input.selectedPlanIds);

    const applications = [];
    for (const procedure of procedures) {
      const items = await dbSelect<any>(`
        SELECT pi.id, ii.name as item_name, ii.item_type as item_type, pi.quantity_used, pi.unit, pi.batch_number_snapshot, ib.expiration_date
        FROM procedure_items_used pi
        INNER JOIN inventory_items ii ON ii.id = pi.inventory_item_id
        LEFT JOIN inventory_batches ib ON ib.id = pi.inventory_batch_id
        WHERE pi.procedure_id = ?
      `, [procedure.procedure_id]);

      applications.push({
        id: procedure.procedure_id,
        date: procedure.finalized_at,
        protocolName: procedure.protocol_name || "Nao informado",
        routeName: procedure.route_name || "Nao informada",
        bodyAreaName: procedure.body_area_name || "Nao informada",
        professionalName: procedure.professional_name || "-",
        finalEvolution: procedure.final_evolution || "",
        intercurrence: procedure.intercurrence_description || "",
        items: items.map((item: any) => ({
          id: item.id,
          name: item.item_name,
          type: item.item_type,
          quantity: item.quantity_used,
          unit: item.unit || "un",
          batchNumber: item.batch_number_snapshot || "",
          expirationDate: item.expiration_date || null,
        })),
      });
    }

    return {
      patientName: input.patientName,
      patientEmail: input.patientEmail || "",
      clinicName: "Dra. Ana Morong",
      applications,
    };
  },
};
