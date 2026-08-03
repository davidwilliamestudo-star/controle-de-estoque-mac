/**
 * useReportData.ts
 *
 * Hook agregador central: busca dados de qualquer tipo de relatório
 * FORA dos componentes PDF. Os documentos recebem `data` como prop.
 *
 * Isso corrige o anti-pattern de useQuery dentro de componentes @react-pdf/renderer.
 */
import { useQuery } from "@tanstack/react-query";
import { reportsService } from "../services/reports.service";
import type { ReportFilter, ReportType } from "../schemas/report.schema";

export const REPORTS_QUERY_KEY = ["reports"] as const;

export type ReportDataState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "ready"; data: unknown; reportType: Exclude<ReportType, null> };

// --- Hooks individuais (mantidos para compatibilidade) ---

export function useStockPositionReport(filter: ReportFilter) {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "stock_position", filter],
    queryFn: () => reportsService.getStockPosition(filter),
    staleTime: 30_000,
  });
}

export function useStockMovementsReport(filter: ReportFilter, enabled: boolean) {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "stock_movements", filter],
    queryFn: () => reportsService.getStockMovements(filter),
    enabled,
    staleTime: 30_000,
  });
}

export function useConsumptionReport(filter: ReportFilter, enabled: boolean) {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "consumption", filter],
    queryFn: () => reportsService.getConsumption(filter),
    enabled,
    staleTime: 30_000,
  });
}

export function useTraceabilityReport(batchNumber: string, enabled: boolean) {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "traceability", batchNumber],
    queryFn: () => reportsService.getTraceabilityByBatch(batchNumber),
    enabled,
    staleTime: 30_000,
  });
}

export function usePatientHistoryReport(filter: ReportFilter, enabled: boolean) {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "patient_history", filter],
    queryFn: () => reportsService.getPatientHistory(filter),
    enabled,
    staleTime: 30_000,
  });
}

export function usePatientGeneralReport(patientId: string | undefined) {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "patient_general", patientId],
    queryFn: () => reportsService.getPatientGeneralReport(patientId!),
    enabled: !!patientId,
    staleTime: 30_000,
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
    staleTime: 30_000,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "users"],
    queryFn: () => reportsService.listUsers(),
    staleTime: 5 * 60_000, // 5 min — usuários mudam raramente
  });
}

export function useDashboardKPIs() {
  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, "kpis"],
    queryFn: () => reportsService.getDashboardKPIs(),
    staleTime: 60_000,
  });
}

// --- Hook Agregador Principal ---
// Recebe reportType + filter → retorna dados prontos para o PDF
export function useReportData(
  reportType: ReportType,
  filter: ReportFilter
): { data: unknown; isLoading: boolean; isError: boolean; error: Error | null } {
  const isDetailedType = reportType
    ? !["stock_position", "stock_movements", "stock_consumption", "patients_by_batch", "patient_history", "patient_general"].includes(reportType)
    : false;

  const stockPositionResult = useStockPositionReport(filter);
  const stockMovementsResult = useStockMovementsReport(filter, reportType === "stock_movements");
  const consumptionResult = useConsumptionReport(filter, reportType === "stock_consumption");
  const traceabilityResult = useTraceabilityReport(
    filter.batchNumber || "",
    reportType === "patients_by_batch" && !!filter.batchNumber
  );
  const patientHistoryResult = usePatientHistoryReport(filter, reportType === "patient_history");
  const patientGeneralResult = usePatientGeneralReport(
    reportType === "patient_general" ? filter.patientId : undefined
  );
  const detailedResult = useDetailedReport(
    reportType && isDetailedType ? (reportType as Exclude<ReportType, null>) : null,
    filter,
    isDetailedType
  );

  switch (reportType) {
    case "stock_position":
      return {
        data: stockPositionResult.data ?? [],
        isLoading: stockPositionResult.isLoading,
        isError: stockPositionResult.isError,
        error: stockPositionResult.error as Error | null,
      };
    case "stock_movements":
      return {
        data: stockMovementsResult.data ?? [],
        isLoading: stockMovementsResult.isLoading,
        isError: stockMovementsResult.isError,
        error: stockMovementsResult.error as Error | null,
      };
    case "stock_consumption":
      return {
        data: consumptionResult.data ?? [],
        isLoading: consumptionResult.isLoading,
        isError: consumptionResult.isError,
        error: consumptionResult.error as Error | null,
      };
    case "patients_by_batch":
      return {
        data: traceabilityResult.data ?? [],
        isLoading: traceabilityResult.isLoading,
        isError: traceabilityResult.isError,
        error: traceabilityResult.error as Error | null,
      };
    case "patient_history":
      return {
        data: patientHistoryResult.data ?? [],
        isLoading: patientHistoryResult.isLoading,
        isError: patientHistoryResult.isError,
        error: patientHistoryResult.error as Error | null,
      };
    case "patient_general":
      return {
        data: patientGeneralResult.data ?? null,
        isLoading: patientGeneralResult.isLoading,
        isError: patientGeneralResult.isError,
        error: patientGeneralResult.error as Error | null,
      };
    default:
      if (isDetailedType) {
        return {
          data: detailedResult.data ?? null,
          isLoading: detailedResult.isLoading,
          isError: detailedResult.isError,
          error: detailedResult.error as Error | null,
        };
      }
      return { data: null, isLoading: false, isError: false, error: null };
  }
}
