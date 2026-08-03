import { useQuery } from "@tanstack/react-query";
import { monthlySummaryService } from "../services/monthlySummary.service";

export const MONTHLY_SUMMARY_KEY = ["monthly-summary"] as const;

export function useMonthlySummary(year: number, month: number) {
  return useQuery({
    queryKey: [...MONTHLY_SUMMARY_KEY, year, month],
    queryFn: () => monthlySummaryService.getMonthlySummary(year, month),
    staleTime: 30_000,
  });
}

export function usePatientMonthlyCost(patientId: string | null, year: number, month: number) {
  return useQuery({
    queryKey: [...MONTHLY_SUMMARY_KEY, "patient", patientId, year, month],
    queryFn: () =>
      patientId
        ? monthlySummaryService.getPatientMonthlyCost(patientId, year, month)
        : null,
    enabled: !!patientId,
    staleTime: 30_000,
  });
}

export function useProtocolSetupFlags(protocolIds: string[]) {
  const sorted = [...protocolIds].sort().join(",");
  return useQuery({
    queryKey: [...MONTHLY_SUMMARY_KEY, "protocol-setup", sorted],
    queryFn: () => monthlySummaryService.getProtocolSetupFlags(protocolIds),
    enabled: protocolIds.length > 0,
    staleTime: 15_000,
  });
}
