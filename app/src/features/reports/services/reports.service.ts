import { auditRepository } from "@/features/audit/repositories/audit.repository";
import { reportsRepository } from "../repositories/reports.repository";
import type { ReportFilter, ReportType } from "../schemas/report.schema";

export const reportsService = {
  async getDashboardKPIs() {
    return reportsRepository.getDashboardKPIs();
  },

  async getStockPosition(filter: ReportFilter) {
    await auditRepository.log({
      action: "report_viewed",
      entity_type: "report",
      entity_id: "stock_position",
      description: "Gerou relatorio de posicao de estoque",
    });
    return reportsRepository.getStockPosition(filter);
  },

  async getStockMovements(filter: ReportFilter) {
    await auditRepository.log({
      action: "report_viewed",
      entity_type: "report",
      entity_id: "stock_movements",
      description: `Gerou relatorio de movimentacoes (${filter.startDate || "inicio"} a ${filter.endDate || "fim"})`,
    });
    return reportsRepository.getStockMovements(filter);
  },

  async getConsumption(filter: ReportFilter) {
    await auditRepository.log({
      action: "report_viewed",
      entity_type: "report",
      entity_id: "consumption",
      description: `Gerou relatorio de consumo (${filter.startDate || "inicio"} a ${filter.endDate || "fim"})`,
    });
    return reportsRepository.getConsumption(filter);
  },

  async getTraceabilityByBatch(batchNumber: string) {
    await auditRepository.log({
      action: "report_viewed",
      entity_type: "report",
      entity_id: "traceability",
      description: `Gerou relatorio de rastreabilidade para o lote: ${batchNumber}`,
    });
    return reportsRepository.getTraceabilityByBatch(batchNumber);
  },

  async getPatientHistory(filter: ReportFilter) {
    await auditRepository.log({
      action: "report_viewed",
      entity_type: "report",
      entity_id: "patient_history",
      description: `Gerou relatorio de historico de aplicacoes (${filter.startDate || "inicio"} a ${filter.endDate || "fim"})`,
    });
    return reportsRepository.getPatientHistory(filter);
  },

  async getPatientGeneralReport(patientId: string) {
    await auditRepository.log({
      action: "report_viewed",
      entity_type: "report",
      entity_id: "patient_general",
      description: `Gerou relatorio geral do paciente para o ID: ${patientId}`,
    });
    return reportsRepository.getPatientGeneralReport(patientId);
  },

  async getDetailedReport(type: Exclude<ReportType, null>, filter: ReportFilter) {
    await auditRepository.log({
      action: "report_viewed",
      entity_type: "report",
      entity_id: type,
      description: `Gerou relatorio operacional: ${type}`,
    });
    return reportsRepository.getDetailedReport(type, filter);
  },
};
