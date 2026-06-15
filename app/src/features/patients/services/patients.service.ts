/**
 * patients.service.ts
 * Regras de negócio para Pacientes.
 * As telas não devem acessar o banco diretamente — apenas este service.
 */
import { patientsRepository } from "../repositories/patients.repository";
import { auditRepository } from "@/features/audit/repositories/audit.repository";
import type { PatientFormData, Patient, PatientRecord, PatientRecordLoadResult } from "../schemas/patient.schema";

export const patientsService = {
  /** Lista pacientes com busca e filtro de status */
  async listPatients(search = "", activeOnly = false): Promise<Patient[]> {
    return patientsRepository.findAll(search, activeOnly);
  },

  /** Retorna dados completos do paciente com histórico de atendimentos */
  async getPatientRecord(id: string): Promise<PatientRecordLoadResult> {
    const patient = await patientsRepository.findByIdAnyStatus(id);
    if (!patient) return { status: "not_found" };

    const hasMergeColumns = await patientsRepository.hasColumn("patients", "merged_into_patient_id");
    const redirectPatientId = hasMergeColumns ? patient.merged_into_patient_id : null;
    if (redirectPatientId && patient.merge_status === "merged") {
      return { status: "merged", redirectPatientId };
    }

    const emptyRecord: PatientRecord = { ...patient, procedures: [] };
    if (patient.deleted_at) {
      return { status: "deleted", patient: emptyRecord };
    }

    try {
      const procedures = await patientsRepository.findProcedures(id);
      return { status: "found", patient: { ...patient, procedures } };
    } catch (error) {
      console.error("Erro ao carregar historico resumido do paciente:", error);
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: "partial",
        patient: emptyRecord,
        warnings: [`Paciente carregado, mas houve erro ao carregar historico: ${message}`],
      };
    }
  },

  /** Cria novo paciente e registra auditoria */
  async createPatient(data: PatientFormData): Promise<string> {
    const id = crypto.randomUUID();
    await patientsRepository.create(id, data);

    await auditRepository.log({
      action: "patient_created",
      entity_type: "patient",
      entity_id: id,
      description: `Paciente "${data.full_name}" cadastrado.`,
      after_data: { ...data, id },
    });

    return id;
  },

  /** Atualiza paciente e registra auditoria */
  async updatePatient(id: string, data: Partial<PatientFormData>): Promise<void> {
    const before = await patientsRepository.findById(id);
    await patientsRepository.update(id, data);

    await auditRepository.log({
      action: "patient_updated",
      entity_type: "patient",
      entity_id: id,
      description: `Paciente "${before?.full_name ?? id}" atualizado.`,
      before_data: before,
      after_data: data,
    });
  },

  /** Inativa paciente (soft delete) */
  async deactivatePatient(id: string): Promise<void> {
    const patient = await patientsRepository.findById(id);
    await patientsRepository.update(id, { is_active: false });

    await auditRepository.log({
      action: "patient_deactivated",
      entity_type: "patient",
      entity_id: id,
      description: `Paciente "${patient?.full_name ?? id}" inativado.`,
      before_data: patient,
    });
  },

  /** Reativa paciente */
  async reactivatePatient(id: string): Promise<void> {
    const patient = await patientsRepository.findById(id);
    await patientsRepository.update(id, { is_active: true });

    await auditRepository.log({
      action: "patient_reactivated",
      entity_type: "patient",
      entity_id: id,
      description: `Paciente "${patient?.full_name ?? id}" reativado.`,
    });
  },
};
