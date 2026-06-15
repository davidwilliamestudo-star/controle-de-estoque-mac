/**
 * patients.repository.ts
 * Comunicação direta com SQLite — sem regras de negócio.
 */
import { dbSelect, dbExecute } from "@/lib/db/sqlite";
import type { Patient, ProcedureSummary, PatientFormData } from "../schemas/patient.schema";

const CLINIC_ID = "ana-morong-clinic";

export const patientsRepository = {
  /** Lista pacientes com métricas agregadas */
  async findAll(search = "", activeOnly = false): Promise<Patient[]> {
    const conditions: string[] = ["p.clinic_id = ?", "p.deleted_at IS NULL"];
    const params: unknown[] = [CLINIC_ID];

    if (search) {
      conditions.push("(p.full_name LIKE ? OR p.phone LIKE ? OR p.email LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (activeOnly) {
      conditions.push("p.is_active = 1");
    }

    const where = conditions.join(" AND ");

    return dbSelect<Patient>(`
      SELECT
        p.*,
        COUNT(pr.id) AS total_procedures,
        MAX(pr.performed_at) AS last_procedure_date,
        (
          SELECT pt.name
          FROM procedures pr2
          LEFT JOIN protocols pt ON pt.id = pr2.protocol_id
          WHERE pr2.patient_id = p.id AND pr2.status = 'finalized' AND pr2.deleted_at IS NULL
          ORDER BY pr2.performed_at DESC
          LIMIT 1
        ) AS last_protocol_name
      FROM patients p
      LEFT JOIN procedures pr ON pr.patient_id = p.id AND pr.status = 'finalized' AND pr.deleted_at IS NULL
      WHERE ${where}
      GROUP BY p.id
      ORDER BY p.full_name ASC
    `, params);
  },

  /** Busca um paciente por ID */
  async findById(id: string): Promise<Patient | null> {
    const rows = await dbSelect<Patient>(`
      SELECT * FROM patients WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL
    `, [id, CLINIC_ID]);
    return rows[0] ?? null;
  },

  /** Busca um paciente por ID sem esconder removidos logicamente. */
  async findByIdAnyStatus(id: string): Promise<Patient | null> {
    const rows = await dbSelect<Patient>(`
      SELECT * FROM patients WHERE id = ? AND clinic_id = ?
    `, [id, CLINIC_ID]);
    return rows[0] ?? null;
  },

  async hasColumn(tableName: string, columnName: string): Promise<boolean> {
    const rows = await dbSelect<{ name: string }>(`PRAGMA table_info(${tableName})`);
    return rows.some(row => row.name === columnName);
  },

  /** Busca atendimentos finalizados do paciente */
  async findProcedures(patientId: string): Promise<ProcedureSummary[]> {
    return dbSelect<ProcedureSummary>(`
      SELECT
        pr.id,
        pr.performed_at,
        pr.status,
        pr.had_intercurrence,
        pr.intercurrence_description,
        pr.evolution_text,
        pt.name AS protocol_name,
        COALESCE(ba.display_name, ba.name) AS body_area_name,
        COALESCE(ba.display_name, ba.name) AS body_area_technical_name,
        ba.svg_region_id AS body_area_svg_id,
        ar.name AS route_name
      FROM procedures pr
      LEFT JOIN protocols pt ON pt.id = pr.protocol_id
      LEFT JOIN body_areas ba ON ba.id = pr.body_area_id
      LEFT JOIN administration_routes ar ON ar.id = pt.administration_route_id
      WHERE pr.patient_id = ? AND pr.deleted_at IS NULL
      ORDER BY pr.performed_at DESC
    `, [patientId]);
  },

  /** Cria novo paciente */
  async create(id: string, data: PatientFormData): Promise<void> {
    await dbExecute(`
      INSERT INTO patients (id, clinic_id, full_name, phone, email, document, birth_date, notes, alert_notes, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      CLINIC_ID,
      data.full_name,
      data.phone || null,
      data.email || null,
      data.document || null,
      data.birth_date || null,
      data.notes || null,
      data.alert_notes || null,
      data.is_active ? 1 : 0,
    ]);
  },

  /** Atualiza paciente existente */
  async update(id: string, data: Partial<PatientFormData>): Promise<void> {
    await dbExecute(`
      UPDATE patients SET
        full_name   = COALESCE(?, full_name),
        phone       = ?,
        email       = ?,
        document    = ?,
        birth_date  = ?,
        notes       = ?,
        alert_notes = ?,
        is_active   = COALESCE(?, is_active),
        updated_at  = datetime('now')
      WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL
    `, [
      data.full_name ?? null,
      data.phone ?? null,
      data.email ?? null,
      data.document ?? null,
      data.birth_date ?? null,
      data.notes ?? null,
      data.alert_notes ?? null,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : null,
      id,
      CLINIC_ID,
    ]);
  },

  /** Exclusão lógica */
  async softDelete(id: string): Promise<void> {
    await dbExecute(`
      UPDATE patients SET deleted_at = datetime('now'), is_active = 0, updated_at = datetime('now')
      WHERE id = ? AND clinic_id = ?
    `, [id, CLINIC_ID]);
  },
};
