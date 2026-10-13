import { auditRepository } from "@/features/audit/repositories/audit.repository";
import { downloadFile } from "@/lib/utils/download";
import Papa from "papaparse";
import { reportsRepository } from "../repositories/reports.repository";
import type { ReportFilter, ReportType } from "../schemas/report.schema";

const typeMap = {
  entry: "Entrada",
  exit: "Saida Manual",
  automatic_exit: "Uso em Paciente",
  adjustment: "Ajuste",
  loss: "Perda",
  expired: "Vencido",
  correction: "Correcao",
};

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

  async listUsers() {
    return reportsRepository.listUsers();
  },

  async exportReport(type: Exclude<ReportType, null>, filter: ReportFilter): Promise<string | null> {
    let csvData: Record<string, unknown>[] = [];

    if (type === "stock_position") {
      const rows = await reportsRepository.getStockPosition(filter);
      csvData = rows.map(r => ({
        "Item": r.item_name,
        "Categoria": r.category_name || "-",
        "Saldo": r.current_stock,
        "Unidade": r.control_unit,
        "Mínimo": r.minimum_stock,
        "Lotes Ativos": r.active_batches,
        "Próximo Vencimento": r.next_expiration_date || "-"
      }));
    } else if (type === "stock_movements") {
      const rows = await reportsRepository.getStockMovements(filter);
      csvData = rows.map(r => ({
        "Data/Hora": r.created_at,
        "Tipo": typeMap[r.movement_type] || r.movement_type,
        "Item": r.item_name,
        "Lote": r.batch_number || "-",
        "Quantidade": r.control_quantity,
        "Unidade": r.control_unit,
        "Motivo": r.reason || "-"
      }));
    } else if (type === "stock_consumption") {
      const rows = await reportsRepository.getConsumption(filter);
      csvData = rows.map(r => ({
        "Item Consumido": r.item_name,
        "Quantidade Total": r.total_consumed,
        "Unidade": r.control_unit
      }));
    } else if (type === "patients_by_batch") {
      const rows = await reportsRepository.getTraceabilityByBatch(filter.batchNumber || "");
      csvData = rows.map(r => ({
        "Data da Aplicação": r.performed_at,
        "Paciente": r.patient_name,
        "Protocolo": r.protocol_name || "Aplicação Avulsa",
        "Item Utilizado": r.item_name,
        "Quantidade": r.quantity_used,
        "Unidade": r.control_unit
      }));
    } else if (type === "patient_history") {
      const rows = await reportsRepository.getPatientHistory(filter);
      csvData = rows.map(r => ({
        "Data": r.performed_at,
        "Paciente": r.patient_name,
        "Protocolo": r.protocol_name || "Procedimento Avulso",
        "Área Tratada": r.body_area_name || "-",
        "Itens Usados": r.total_items_used,
        "Teve Intercorrência": r.had_intercurrence ? "Sim" : "Não"
      }));
    } else if (type === "patient_general") {
      const data = await reportsRepository.getPatientGeneralReport(filter.patientId || "");
      if (!data || !data.patient) throw new Error("Paciente não encontrado.");
      csvData = data.procedures.map(p => ({
        "Paciente": data.patient!.full_name,
        "Data": p.performed_at,
        "Protocolo": p.protocol_name || "Aplicação Avulsa",
        "Área Corporal": p.body_area_name || "-",
        "Status": p.status,
        "Itens Utilizados": p.total_items_used,
        "Teve Intercorrência": p.had_intercurrence ? "Sim" : "Não",
        "Evolução": p.evolution_text || "-",
        "Descrição da Intercorrência": p.intercurrence_description || "-"
      }));
    } else {
      const data = await reportsRepository.getDetailedReport(type, filter);
      csvData = data.rows.map(row => {
        const formatted: Record<string, unknown> = {};
        data.columns.forEach(col => {
          formatted[col.label] = row[col.key];
        });
        return formatted;
      });
    }

    const csvString = Papa.unparse(csvData, {
      quotes: true,
      delimiter: ";",
      header: true,
      newline: "\r\n",
    });

    const filePath = await downloadFile({
      filename: `relatorio_${type}_${new Date().toISOString().slice(0, 10)}.csv`,
      content: csvString,
      mimeType: "text/csv;charset=utf-8",
      filters: [{ name: "CSV separado por ponto e vírgula", extensions: ["csv"] }],
    });

    if (!filePath) return null;

    await auditRepository.log({
      action: "report_viewed", // or report_exported, keeping standard type
      entity_type: "report",
      entity_id: type,
      description: `Exportou relatorio ${type} para CSV`,
    });

    return filePath;
  },
};
