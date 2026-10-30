import { dbSelect, dbExecute } from "@/lib/db/sqlite";
import type { Procedure, ProcedureItemUsed } from "../types";

class ProceduresRepository {
  async listAll(): Promise<Procedure[]> {
    const sql = `
      SELECT p.*,
             pat.full_name as patientName,
             prot.name as protocolName,
             COALESCE(ba.display_name, ba.name) as bodyAreaName,
             COALESCE(ba.display_name, ba.name) as bodyAreaTechnicalName
      FROM procedures p
      JOIN patients pat ON p.patient_id = pat.id
      LEFT JOIN protocols prot ON p.protocol_id = prot.id
      LEFT JOIN body_areas ba ON p.body_area_id = ba.id
      WHERE p.deleted_at IS NULL
      ORDER BY p.performed_at DESC
    `;
    const rows = await dbSelect<any>(sql);
    return rows.map(r => this.mapProcedure(r));
  }

  async findById(id: string): Promise<Procedure | null> {
    const sql = `
      SELECT p.*,
             pat.full_name as patientName,
             prot.name as protocolName,
             COALESCE(ba.display_name, ba.name) as bodyAreaName,
             COALESCE(ba.display_name, ba.name) as bodyAreaTechnicalName
      FROM procedures p
      JOIN patients pat ON p.patient_id = pat.id
      LEFT JOIN protocols prot ON p.protocol_id = prot.id
      LEFT JOIN body_areas ba ON p.body_area_id = ba.id
      WHERE p.id = ? AND p.deleted_at IS NULL
    `;
    const rows = await dbSelect<any>(sql, [id]);
    return rows.length > 0 ? this.mapProcedure(rows[0]) : null;
  }

  async create(data: Partial<Procedure>): Promise<string> {
    const id = data.id || crypto.randomUUID();
    const sql = `
      INSERT INTO procedures (
        id, patient_id, protocol_id, appointment_id, application_plan_id, body_area_id, performed_at, status, 
        had_intercurrence, intercurrence_description, notes, evolution_text, responsible_user_id, finalized_at,
        subtotal, discount_amount, discount_type, total_amount, payment_method, payment_status,
        patient_plan_id, plan_charge_mode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await dbExecute(sql, [
      id,
      data.patientId,
      data.protocolId ?? null,
      data.appointmentId ?? null,
      data.applicationPlanId ?? null,
      data.bodyAreaId ?? null,
      data.performedAt || new Date().toISOString(),
      data.status || 'draft',
      data.hadIntercurrence ? 1 : 0,
      data.intercurrenceDescription ?? null,
      data.notes ?? null,
      data.evolutionText ?? null,
      data.responsibleUserId ?? null,
      data.finalizedAt ?? null,
      data.subtotal ?? 0,
      data.discountAmount ?? 0,
      data.discountType ?? 'fixed',
      data.totalAmount ?? 0,
      data.paymentMethod ?? null,
      data.paymentStatus ?? 'pending',
      data.patientPlanId ?? null,
      data.planChargeMode ?? null,
    ]);
    return id;
  }

  async update(id: string, data: Partial<Procedure>): Promise<void> {
    const sql = `
      UPDATE procedures SET
        patient_id = COALESCE(?, patient_id),
        protocol_id = ?,
        appointment_id = ?,
        application_plan_id = ?,
        body_area_id = ?,
        performed_at = COALESCE(?, performed_at),
        status = COALESCE(?, status),
        had_intercurrence = COALESCE(?, had_intercurrence),
        intercurrence_description = ?,
        notes = ?,
        evolution_text = ?,
        responsible_user_id = ?,
        finalized_at = ?,
        subtotal = COALESCE(?, subtotal),
        discount_amount = COALESCE(?, discount_amount),
        discount_type = COALESCE(?, discount_type),
        total_amount = COALESCE(?, total_amount),
        payment_method = ?,
        payment_status = COALESCE(?, payment_status),
        patient_plan_id = ?,
        plan_charge_mode = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `;
    await dbExecute(sql, [
      data.patientId,
      data.protocolId ?? null,
      data.appointmentId ?? null,
      data.applicationPlanId ?? null,
      data.bodyAreaId ?? null,
      data.performedAt,
      data.status,
      data.hadIntercurrence !== undefined ? (data.hadIntercurrence ? 1 : 0) : undefined,
      data.intercurrenceDescription ?? null,
      data.notes ?? null,
      data.evolutionText ?? null,
      data.responsibleUserId ?? null,
      data.finalizedAt ?? null,
      data.subtotal,
      data.discountAmount,
      data.discountType,
      data.totalAmount,
      data.paymentMethod ?? null,
      data.paymentStatus,
      data.patientPlanId ?? null,
      data.planChargeMode ?? null,
      id
    ]);
  }

  async listItems(procedureId: string): Promise<ProcedureItemUsed[]> {
    const sql = `
      SELECT pi.*, i.name as itemName
      FROM procedure_items_used pi
      JOIN inventory_items i ON pi.inventory_item_id = i.id
      WHERE pi.procedure_id = ? AND pi.is_corrected = 0
    `;
    const rows = await dbSelect<any>(sql, [procedureId]);
    return rows.map(r => ({
      id: r.id,
      procedureId: r.procedure_id,
      inventoryItemId: r.inventory_item_id,
      inventoryBatchId: r.inventory_batch_id,
      itemType: r.item_type,
      quantityUsed: Number(r.quantity_used),
      unit: r.unit,
      batchNumberSnapshot: r.batch_number_snapshot,
      expirationDateSnapshot: r.expiration_date_snapshot,
      notes: r.notes,
      isCorrected: Number(r.is_corrected || 0),
      correctedAt: r.corrected_at,
      correctionGroupId: r.correction_group_id,
      itemName: r.itemName
    }));
  }

  async createItem(data: Partial<ProcedureItemUsed>): Promise<void> {
    const id = data.id || crypto.randomUUID();
    const sql = `
      INSERT INTO procedure_items_used (
      id, procedure_id, procedure_application_id, inventory_item_id, inventory_batch_id, item_type,
      quantity_used, unit, batch_number_snapshot, expiration_date_snapshot, notes,
      is_corrected, corrected_at, correction_group_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await dbExecute(sql, [
    id,
    data.procedureId,
    data.procedureApplicationId || null,
    data.inventoryItemId,
    data.inventoryBatchId || null,
    data.itemType,
    data.quantityUsed,
    data.unit,
    data.batchNumberSnapshot || null,
    data.expirationDateSnapshot || null,
    data.notes || null,
    data.isCorrected ?? 0,
    data.correctedAt || null,
    data.correctionGroupId || null
  ]);
  }

  async deleteItems(procedureId: string): Promise<void> {
    const sql = `DELETE FROM procedure_items_used WHERE procedure_id = ?`;
    await dbExecute(sql, [procedureId]);
  }

  /** Cria uma aplicação individual dentro de uma sessão clínica */
  async createApplication(data: { id: string; procedureId: string; protocolId?: string | null; bodyAreaId?: string | null; sortOrder?: number; notes?: string | null }): Promise<void> {
    await dbExecute(`
      INSERT INTO procedure_applications (id, procedure_id, protocol_id, body_area_id, sort_order, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      data.id,
      data.procedureId,
      data.protocolId || null,
      data.bodyAreaId || null,
      data.sortOrder ?? 0,
      data.notes ?? null,
    ]);
  }

  /** Lista todas as aplicações de um procedimento com nomes de protocolo e área */
  async listApplicationsForProcedure(procedureId: string): Promise<any[]> {
    return dbSelect(`
      SELECT
        pa.*,
        prot.name AS protocol_name,
        COALESCE(ba.display_name, ba.name) AS body_area_name
      FROM procedure_applications pa
      LEFT JOIN protocols prot ON prot.id = pa.protocol_id
      LEFT JOIN body_areas ba ON ba.id = pa.body_area_id
      WHERE pa.procedure_id = ?
      ORDER BY pa.sort_order ASC, pa.created_at ASC
    `, [procedureId]);
  }

  /** Remove todas as aplicações de um procedimento (antes de recriar) */
  async deleteApplications(procedureId: string): Promise<void> {
    await dbExecute(`DELETE FROM procedure_applications WHERE procedure_id = ?`, [procedureId]);
  }

  async listBodyAreas(): Promise<BodyArea[]> {
    const rows = await dbSelect<any>(`
      SELECT id, name, slug, svg_region_id, description, display_name, anatomical_region, side, view_position, route_code, clinical_notes
      FROM body_areas
      WHERE is_active = 1 AND clinic_id = 'ana-morong-clinic'
      ORDER BY COALESCE(display_name, name) ASC
    `);
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      svgRegionId: r.svg_region_id,
      description: r.description,
      displayName: r.display_name,
      technicalName: r.display_name ?? r.name,
      canonicalSlug: null,
      anatomicalRegion: r.anatomical_region,
      side: r.side,
      viewPosition: r.view_position,
      routeCode: r.route_code,
      clinicalNotes: r.clinical_notes,
    }));
  }

  /** Lista rotas de administração ativas */
  async listAdministrationRoutes(): Promise<AdministrationRoute[]> {
    const rows = await dbSelect<any>(`
      SELECT id, name, description
      FROM administration_routes
      WHERE is_active = 1 AND clinic_id = 'ana-morong-clinic'
      ORDER BY name ASC
    `);
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
    }));
  }

  /** Retorna as body_areas associadas a uma rota específica */
  async getBodyAreasByRouteId(routeId: string): Promise<string[]> {
    const rows = await dbSelect<any>(`
      SELECT ba.slug
      FROM route_body_areas rba
      JOIN body_areas ba ON ba.id = rba.body_area_id
      WHERE rba.administration_route_id = ?
    `, [routeId]);
    return rows.map(r => r.slug);
  }

  /** Busca os lotes disponíveis de um item de inventário (ordem FEFO: primeiro a vencer primeiro) */
  async listBatchesForItem(itemId: string): Promise<InventoryBatch[]> {
    const rows = await dbSelect<any>(`
      SELECT id, batch_number, expiration_date, current_quantity, unit_cost
      FROM inventory_batches
      WHERE inventory_item_id = ?
        AND current_quantity > 0
        AND deleted_at IS NULL
      ORDER BY expiration_date ASC NULLS LAST
    `, [itemId]);
    return rows.map(r => ({
      id: r.id,
      batchNumber: r.batch_number,
      expirationDate: r.expiration_date,
      currentQuantity: Number(r.current_quantity),
      unitCost: r.unit_cost ? Number(r.unit_cost) : null,
    }));
  }

  /** Busca o administration_route_id de um protocolo */
  async getProtocolRouteId(protocolId: string): Promise<string | null> {
    const rows = await dbSelect<any>(`
      SELECT administration_route_id FROM protocols WHERE id = ?
    `, [protocolId]);
    return rows[0]?.administration_route_id ?? null;
  }

  /** Busca o administration_route_id de um item de inventário */
  async getInventoryItemRouteId(itemId: string): Promise<string | null> {
    const rows = await dbSelect<any>(`
      SELECT administration_route_id FROM inventory_items WHERE id = ?
    `, [itemId]);
    return rows[0]?.administration_route_id ?? null;
  }

  /** Busca os procedimentos de um paciente para o histórico */
  async listPatientProcedures(patientId: string): Promise<PatientProcedureSummary[]> {
    const rows = await dbSelect<any>(`
      SELECT p.id, p.performed_at, p.status, p.had_intercurrence, p.evolution_text,
             p.notes, p.body_area_id, p.is_corrected, p.correction_reason, p.corrected_at,
             COALESCE(ba.display_name, ba.name) as body_area_name, 
             COALESCE(ba.display_name, ba.name) as body_area_technical_name,
             ba.svg_region_id as body_area_svg_id,
             prot.name as protocol_name, prot.administration_route_id as route_id,
             ar.name as route_name
      FROM procedures p
      LEFT JOIN body_areas ba ON ba.id = p.body_area_id
      LEFT JOIN protocols prot ON prot.id = p.protocol_id
      LEFT JOIN administration_routes ar ON ar.id = prot.administration_route_id
      WHERE p.patient_id = ? AND p.deleted_at IS NULL
      ORDER BY p.performed_at DESC
    `, [patientId]);
    const summaries = rows.map(r => ({
      id: r.id,
      performedAt: r.performed_at,
      status: r.status,
      hadIntercurrence: Boolean(r.had_intercurrence),
      evolutionText: r.evolution_text,
      notes: r.notes,
      bodyAreaId: r.body_area_id,
      bodyAreaName: r.body_area_name,
      bodyAreaTechnicalName: r.body_area_technical_name,
      bodyAreaSvgId: r.body_area_svg_id,
      protocolName: r.protocol_name,
      routeId: r.route_id,
      routeName: r.route_name,
      isCorrected: Number(r.is_corrected || 0),
      correctionReason: r.correction_reason,
      items: [] as ProcedureItemUsed[],
    }));

    for (const summary of summaries) {
      summary.items = await this.listItems(summary.id);
    }

    return summaries;
  }

  private mapProcedure(r: any): Procedure {
    return {
      id: r.id,
      patientId: r.patient_id,
      protocolId: r.protocol_id,
      appointmentId: r.appointment_id,
      applicationPlanId: r.application_plan_id,
      bodyAreaId: r.body_area_id,
      performedAt: r.performed_at,
      status: r.status,
      hadIntercurrence: Number(r.had_intercurrence),
      intercurrenceDescription: r.intercurrence_description,
      notes: r.notes,
      evolutionText: r.evolution_text,
      responsibleUserId: r.responsible_user_id,
      finalizedAt: r.finalized_at,
      subtotal: Number(r.subtotal || 0),
      discountAmount: Number(r.discount_amount || 0),
      discountType: r.discount_type || 'fixed',
      totalAmount: Number(r.total_amount || 0),
      paymentMethod: r.payment_method,
      paymentStatus: r.payment_status || 'pending',
      patientName: r.patientName,
      protocolName: r.protocolName,
      bodyAreaName: r.bodyAreaName,
      bodyAreaTechnicalName: r.bodyAreaTechnicalName,
      patientPlanId: r.patient_plan_id,
      planChargeMode: r.plan_charge_mode,
      isCorrected: Number(r.is_corrected || 0),
      correctedAt: r.corrected_at,
      correctionReason: r.correction_reason
    };
  }
}

export const proceduresRepository = new ProceduresRepository();

// ─── Exported Types ─────────────────────────────────────────────────────────

export interface BodyArea {
  id: string;
  name: string;
  slug: string;
  svgRegionId: string | null;
  description: string | null;
  displayName?: string | null;
  technicalName?: string | null;
  canonicalSlug?: string | null;
  anatomicalRegion?: string | null;
  side?: string | null;
  viewPosition?: string | null;
  routeCode?: string | null;
  clinicalNotes?: string | null;
}

export interface AdministrationRoute {
  id: string;
  name: string;
  description: string | null;
}

export interface InventoryBatch {
  id: string;
  batchNumber: string;
  expirationDate: string | null;
  currentQuantity: number;
  unitCost: number | null;
}

export interface PatientProcedureSummary {
  id: string;
  performedAt: string;
  status: string;
  hadIntercurrence: boolean;
  evolutionText: string | null;
  notes: string | null;
  bodyAreaId: string | null;
  bodyAreaName: string | null;
  bodyAreaTechnicalName?: string | null;
  bodyAreaSvgId: string | null;
  protocolName: string | null;
  routeId: string | null;
  routeName: string | null;
  isCorrected?: number;
  correctionReason?: string | null;
  items?: ProcedureItemUsed[];
}
