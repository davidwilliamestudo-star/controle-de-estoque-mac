import { dbSelect, dbExecute } from "@/lib/db/sqlite";
import type { Appointment, AppointmentFormData } from "../schemas/appointment.schema";

const CLINIC_ID = "ana-morong-clinic";

function toDbStatus(status?: AppointmentFormData["status"] | null) {
  if (!status) return null;
  return status === "canceled" ? "cancelled" : status;
}

const appointmentSelect = `
  SELECT
    a.id,
    a.clinic_id,
    a.patient_id,
    a.application_plan_id,
    a.appointment_type AS type,
    a.scheduled_at AS appointment_date,
    a.duration_minutes,
    CASE WHEN a.status = 'cancelled' THEN 'canceled' ELSE a.status END AS status,
    a.notes,
    a.sync_status,
    a.google_calendar_event_id AS google_event_id,
    a.created_at,
    a.updated_at,
    a.deleted_at,
    p.full_name AS patient_name,
    p.phone AS patient_phone,
    p.email AS patient_email
  FROM appointments a
  LEFT JOIN patients p ON p.id = a.patient_id
`;

export const appointmentsRepository = {
  async findById(id: string): Promise<Appointment | null> {
    const rows = await dbSelect<Appointment>(
      `
        ${appointmentSelect}
        WHERE a.clinic_id = ? AND a.id = ? AND a.deleted_at IS NULL
        LIMIT 1
      `,
      [CLINIC_ID, id]
    );
    return rows[0] ?? null;
  },

  async findByDate(date: string): Promise<Appointment[]> {
    return dbSelect<Appointment>(
      `
        ${appointmentSelect}
        WHERE a.clinic_id = ? AND date(a.scheduled_at) = ? AND a.deleted_at IS NULL
        ORDER BY a.scheduled_at ASC
      `,
      [CLINIC_ID, date]
    );
  },

  async findByPatient(patientId: string): Promise<Appointment[]> {
    return dbSelect<Appointment>(
      `
        ${appointmentSelect}
        WHERE a.clinic_id = ? AND a.patient_id = ? AND a.deleted_at IS NULL
        ORDER BY a.scheduled_at DESC
      `,
      [CLINIC_ID, patientId]
    );
  },

  async create(id: string, data: AppointmentFormData): Promise<void> {
    await dbExecute(
      `
        INSERT INTO appointments (
          id,
          clinic_id,
          patient_id,
          application_plan_id,
          appointment_type,
          scheduled_at,
          duration_minutes,
          status,
          notes,
          patient_email_snapshot,
          sync_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT email FROM patients WHERE id = ? AND deleted_at IS NULL), 'not_synced')
      `,
      [
        id,
        CLINIC_ID,
        data.patient_id,
        data.application_plan_id || null,
        data.type,
        data.appointment_date,
        data.duration_minutes,
        toDbStatus(data.status) ?? "scheduled",
        data.notes || null,
        data.patient_id,
      ]
    );
  },

  async update(id: string, data: Partial<AppointmentFormData>): Promise<void> {
    await dbExecute(
      `
        UPDATE appointments SET
          patient_id = COALESCE(?, patient_id),
          patient_email_snapshot = CASE
            WHEN ? THEN (SELECT email FROM patients WHERE id = ? AND deleted_at IS NULL)
            ELSE patient_email_snapshot
          END,
          application_plan_id = CASE WHEN ? THEN ? ELSE application_plan_id END,
          appointment_type = COALESCE(?, appointment_type),
          scheduled_at = COALESCE(?, scheduled_at),
          duration_minutes = COALESCE(?, duration_minutes),
          status = COALESCE(?, status),
          notes = CASE WHEN ? THEN ? ELSE notes END,
          sync_status = 'pending',
          updated_at = datetime('now')
        WHERE id = ? AND clinic_id = ?
      `,
      [
        data.patient_id ?? null,
        data.patient_id !== undefined ? 1 : 0,
        data.patient_id ?? null,
        data.application_plan_id !== undefined ? 1 : 0,
        data.application_plan_id !== undefined ? (data.application_plan_id || null) : null,
        data.type ?? null,
        data.appointment_date ?? null,
        data.duration_minutes ?? null,
        toDbStatus(data.status),
        data.notes !== undefined ? 1 : 0,
        data.notes ?? null,
        id,
        CLINIC_ID,
      ]
    );
  },

  async updateSyncStatus(id: string, syncStatus: string, eventId?: string): Promise<void> {
    await dbExecute(
      `
        UPDATE appointments SET
          sync_status = ?,
          google_calendar_event_id = COALESCE(?, google_calendar_event_id),
          updated_at = datetime('now')
        WHERE id = ? AND clinic_id = ?
      `,
      [syncStatus, eventId ?? null, id, CLINIC_ID]
    );
  },

  async delete(id: string): Promise<void> {
    await dbExecute(
      `
        UPDATE appointments SET
          status = 'cancelled',
          sync_status = 'pending',
          appscript_sync_status = CASE
            WHEN appscript_sync_status = 'synced' THEN 'pending'
            ELSE appscript_sync_status
          END,
          deleted_at = datetime('now'),
          updated_at = datetime('now')
        WHERE id = ? AND clinic_id = ?
      `,
      [id, CLINIC_ID]
    );
  },
};
