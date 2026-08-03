import { monthlySummaryRepository } from "../repositories/monthlySummary.repository";
import type { MonthlySummary, PatientMonthlyCost, ProtocolSetupFlags } from "../types";

export const monthlySummaryService = {
  getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
    return monthlySummaryRepository.getMonthlySummary(year, month);
  },

  getPatientMonthlyCost(
    patientId: string,
    year: number,
    month: number,
  ): Promise<PatientMonthlyCost | null> {
    return monthlySummaryRepository.getPatientMonthlyCost(patientId, year, month);
  },

  getProtocolSetupFlags(protocolIds: string[]): Promise<Record<string, ProtocolSetupFlags>> {
    return monthlySummaryRepository.getProtocolSetupFlags(protocolIds);
  },
};
