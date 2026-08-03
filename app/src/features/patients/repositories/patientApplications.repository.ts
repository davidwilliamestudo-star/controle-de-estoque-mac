import { dbExecute, dbSelect } from "../../../lib/db/sqlite";
import { 
  PatientApplicationPlan, 
  CreatePatientApplicationPlanInput, 
  UpdatePatientApplicationPlanInput 
} from "../types";

export class PatientApplicationsRepository {
  async getByPatientId(patientId: string): Promise<PatientApplicationPlan[]> {
    const rows = await dbSelect<any>(
      `
      SELECT 
        pap.*,
        p.name as protocolName,
        r.name as routeName
      FROM patient_application_plans pap
      LEFT JOIN protocols p ON pap.protocol_id = p.id
      LEFT JOIN administration_routes r ON pap.route_id = r.id
      WHERE pap.patient_id = ? AND pap.deleted_at IS NULL
      ORDER BY
        CASE WHEN pap.scheduled_at IS NULL THEN 1 ELSE 0 END,
        pap.scheduled_at ASC,
        pap.created_at DESC
      `,
      [patientId]
    );

    return rows.map((row) => this.mapRowToPlan(row));
  }

  async getById(id: string): Promise<PatientApplicationPlan | null> {
    const rows = await dbSelect<any>(
      `
      SELECT 
        pap.*,
        p.name as protocolName,
        r.name as routeName,
        pat.full_name as patientName
      FROM patient_application_plans pap
      LEFT JOIN protocols p ON pap.protocol_id = p.id
      LEFT JOIN administration_routes r ON pap.route_id = r.id
      LEFT JOIN patients pat ON pap.patient_id = pat.id
      WHERE pap.id = ? AND pap.deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) return null;
    return this.mapRowToPlan(rows[0]);
  }

  async create(input: CreatePatientApplicationPlanInput & { appointmentId?: string }): Promise<PatientApplicationPlan> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const clinicId = "ana-morong-clinic"; // TODO: get from auth context
    
    // Status padrao
    let status = input.status || "planned";
    if (!input.status && input.scheduledAt) {
      status = "scheduled";
    }

    await dbExecute(
      `
      INSERT INTO patient_application_plans (
        id, clinic_id, patient_id, protocol_id, route_id, 
        appointment_id, scheduled_at, status, notes, 
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, 
        ?, ?, ?, ?, 
        ?, ?
      )
      `,
      [
        id,
        clinicId,
        input.patientId,
        input.protocolId,
        input.routeId,
        input.appointmentId || null,
        input.scheduledAt || null,
        status,
        input.notes || null,
        now,
        now,
      ]
    );

    return {
      id,
      clinicId,
      patientId: input.patientId,
      protocolId: input.protocolId,
      routeId: input.routeId,
      appointmentId: input.appointmentId || null,
      scheduledAt: input.scheduledAt || null,
      status,
      notes: input.notes || null,
      createdByUserId: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    } as PatientApplicationPlan;
  }

  async update(id: string, input: UpdatePatientApplicationPlanInput & { appointmentId?: string | null }): Promise<PatientApplicationPlan> {
    const now = new Date().toISOString();

    const updates: string[] = ["updated_at = ?"];
    const values: any[] = [now];

    if (input.protocolId !== undefined) {
      updates.push(`protocol_id = ?`);
      values.push(input.protocolId);
    }
    if (input.routeId !== undefined) {
      updates.push(`route_id = ?`);
      values.push(input.routeId);
    }
    if (input.scheduledAt !== undefined) {
      updates.push(`scheduled_at = ?`);
      values.push(input.scheduledAt);
    }
    if (input.appointmentId !== undefined) {
      updates.push(`appointment_id = ?`);
      values.push(input.appointmentId);
    }
    if (input.status !== undefined) {
      updates.push(`status = ?`);
      values.push(input.status);
    }
    if (input.notes !== undefined) {
      updates.push(`notes = ?`);
      values.push(input.notes);
    }

    values.push(id);

    await dbExecute(
      `
      UPDATE patient_application_plans 
      SET ${updates.join(", ")}
      WHERE id = ?
      `,
      values
    );

    return { id } as PatientApplicationPlan;
  }

  async delete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await dbExecute(
      `UPDATE patient_application_plans
       SET status = 'cancelled', appointment_id = NULL, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [now, id]
    );
  }

  private mapRowToPlan(row: any): PatientApplicationPlan {
    return {
      id: row.id,
      clinicId: row.clinic_id,
      patientId: row.patient_id,
      protocolId: row.protocol_id,
      routeId: row.route_id,
      appointmentId: row.appointment_id,
      scheduledAt: row.scheduled_at,
      status: row.status,
      notes: row.notes,
      createdByUserId: row.created_by_user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      
      protocolName: row.protocolName,
      routeName: row.routeName,
      patientName: row.patientName,
    };
  }
}

export const patientApplicationsRepository = new PatientApplicationsRepository();
