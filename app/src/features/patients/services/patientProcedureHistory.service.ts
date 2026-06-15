import { patientProcedureHistoryRepository } from "../repositories/patientProcedureHistory.repository";
import type { PatientProcedureHistoryItem } from "../schemas/patient.schema";

export const patientProcedureHistoryService = {
  async getPatientProcedureHistory(patientId: string): Promise<PatientProcedureHistoryItem[]> {
    return patientProcedureHistoryRepository.getPatientProcedureHistory(patientId);
  },

  async getPatientUsedItems(patientId: string): Promise<any[]> {
    return patientProcedureHistoryRepository.getPatientUsedItems(patientId);
  },

  async getPatientUsedBatches(patientId: string): Promise<any[]> {
    return patientProcedureHistoryRepository.getPatientUsedBatches(patientId);
  }
};
