import type {
  ConsumptionRow,
  DashboardKPIs,
  DetailedReportData,
  PatientGeneralReportData,
  PatientHistoryRow,
  ReportFilter,
  ReportType,
  StockMovementRow,
  StockPositionRow,
  TraceabilityRow,
} from "../schemas/report.schema";

import { inventoryReportsRepository } from "./inventory_reports.repository";
import { patientReportsRepository } from "./patient_reports.repository";
import { operationalReportsRepository } from "./operational_reports.repository";
import { buildReport } from "./reports.helpers";

export const reportsRepository = {
  // --- Dashboard KPI ---
  async getDashboardKPIs(): Promise<DashboardKPIs> {
    return inventoryReportsRepository.getDashboardKPIs();
  },

  // --- Inventory Reports ---
  async getStockPosition(filter: ReportFilter): Promise<StockPositionRow[]> {
    return inventoryReportsRepository.getStockPosition(filter);
  },
  async getStockMovements(filter: ReportFilter): Promise<StockMovementRow[]> {
    return inventoryReportsRepository.getStockMovements(filter);
  },
  async getConsumption(filter: ReportFilter): Promise<ConsumptionRow[]> {
    return inventoryReportsRepository.getConsumption(filter);
  },

  // --- Operational Reports ---
  async getTraceabilityByBatch(batchNumber: string): Promise<TraceabilityRow[]> {
    return operationalReportsRepository.getTraceabilityByBatch(batchNumber);
  },

  // --- Patient Reports ---
  async getPatientHistory(filter: ReportFilter): Promise<PatientHistoryRow[]> {
    return patientReportsRepository.getPatientHistory(filter);
  },
  async getPatientGeneralReport(patientId: string): Promise<PatientGeneralReportData> {
    return patientReportsRepository.getPatientGeneralReport(patientId);
  },

  // --- Detailed Report Facade ---
  async getDetailedReport(type: Exclude<ReportType, null>, filter: ReportFilter): Promise<DetailedReportData> {
    switch (type) {
      // Patient Reports
      case "patient_evolutions":
        return patientReportsRepository.getPatientEvolutionsReport(filter);
      case "patient_medications":
        return patientReportsRepository.getPatientUsageReport(filter, "medication");
      case "patient_materials":
        return patientReportsRepository.getPatientUsageReport(filter, "material");
      case "patient_batches":
        return patientReportsRepository.getPatientBatchesReport(filter);
      case "patient_body_areas":
        return patientReportsRepository.getPatientBodyAreasReport(filter);

      // Inventory Reports
      case "stock_low":
        return inventoryReportsRepository.getStockLowReport(filter);
      case "stock_expirations":
        return inventoryReportsRepository.getBatchExpirationReport(filter, "expiring");
      case "stock_expired":
        return inventoryReportsRepository.getBatchExpirationReport(filter, "expired");
      case "stock_entries":
        return inventoryReportsRepository.getStockMovementDetailReport({ ...filter, movementType: "entry" }, "Entradas no Estoque");
      case "stock_exits":
        return inventoryReportsRepository.getStockMovementDetailReport({ ...filter, movementType: "exit" }, "Saidas do Estoque");
      case "stock_forecasting":
        return inventoryReportsRepository.getStockForecastingReport(filter);
      case "top_consumed":
        return inventoryReportsRepository.getTopConsumedProductsReport(filter);

      // Operational Reports
      case "batch_by_item":
        return operationalReportsRepository.getBatchesByItemReport(filter);
      case "protocols_list":
        return operationalReportsRepository.getProtocolsListReport(filter);
      case "protocol_procedures":
        return operationalReportsRepository.getProtocolProceduresReport(filter);
      case "audit_log":
        return operationalReportsRepository.getAuditLogReport(filter);
      case "labels_generated":
        return operationalReportsRepository.getLabelsGeneratedReport(filter);

      default:
        return buildReport("Relatorio", "Tipo de relatorio sem consulta configurada.", [], []);
    }
  },

  async listUsers(): Promise<Array<{ id: string; name: string }>> {
    return operationalReportsRepository.listUsers();
  },
};
