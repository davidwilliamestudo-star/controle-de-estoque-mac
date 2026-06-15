import { useQuery } from "@tanstack/react-query";
import { reportsService } from "../services/reports.service";
import type { ReportFilter, ReportType } from "../schemas/report.schema";

export const REPORTS_QUERY_KEY = ["reports"] as const;

export function useDashboardKPIs() {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "kpis"],
    queryFn: () => reportsService.getDashboardKPIs(),
  });
}

export function useStockPositionReport(filter: ReportFilter) {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "stock_position", filter],
    queryFn: () => reportsService.getStockPosition(filter),
  });
}

export function useStockMovementsReport(filter: ReportFilter, enabled: boolean) {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "stock_movements", filter],
    queryFn: () => reportsService.getStockMovements(filter),
    enabled,
  });
}

export function useConsumptionReport(filter: ReportFilter, enabled: boolean) {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "consumption", filter],
    queryFn: () => reportsService.getConsumption(filter),
    enabled,
  });
}

export function useTraceabilityReport(batchNumber: string, enabled: boolean) {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "traceability", batchNumber],
    queryFn: () => reportsService.getTraceabilityByBatch(batchNumber),
    enabled,
  });
}

export function usePatientHistoryReport(filter: ReportFilter, enabled: boolean) {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "patient_history", filter],
    queryFn: () => reportsService.getPatientHistory(filter),
    enabled,
  });
}

export function usePatientGeneralReport(patientId: string | undefined) {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "patient_general", patientId],
    queryFn: () => reportsService.getPatientGeneralReport(patientId!),
    enabled: !!patientId,
  });
}

export function useDetailedReport(
  type: Exclude<ReportType, null> | null | undefined,
  filter: ReportFilter,
  enabled: boolean
) {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "detailed", type, filter],
    queryFn: () => reportsService.getDetailedReport(type!, filter),
    enabled: Boolean(type) && enabled,
  });
}
