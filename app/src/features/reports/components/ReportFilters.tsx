import { Filter } from "lucide-react";
import { useInventoryOptions } from "@/features/inventory/hooks/useInventoryOptions";
import { usePatients } from "@/features/patients/hooks/usePatients";
import { useProtocols } from "@/features/protocols/hooks/useProtocols";
import type { ReportFilter, ReportType } from "../schemas/report.schema";

interface ReportFiltersProps {
  reportType: ReportType;
  filter: ReportFilter;
  setFilter: (filter: ReportFilter) => void;
  onGenerate: () => void;
  onClear: () => void;
}

const dateReports = [
  "patient_history",
  "patient_evolutions",
  "patient_medications",
  "patient_materials",
  "patient_batches",
  "patient_body_areas",
  "stock_consumption",
  "stock_movements",
  "stock_entries",
  "stock_exits",
  "protocol_procedures",
  "audit_log",
  "labels_generated",
];

const patientReports = [
  "patient_general",
  "patient_history",
  "patient_evolutions",
  "patient_medications",
  "patient_materials",
  "patient_batches",
  "patient_body_areas",
];

const batchReports = ["patient_batches", "batch_by_item", "patients_by_batch"];
const categoryReports = ["stock_position", "stock_low", "stock_expirations", "stock_expired", "stock_consumption", "stock_movements", "stock_entries", "stock_exits", "batch_by_item"];
const itemTypeReports = ["stock_position", "stock_low", "stock_expirations", "stock_expired", "stock_consumption", "stock_movements", "stock_entries", "stock_exits", "batch_by_item"];
const protocolReports = ["protocols_list", "protocol_procedures"];

export function ReportFilters({ reportType, filter, setFilter, onGenerate, onClear }: ReportFiltersProps) {
  const { data: options } = useInventoryOptions();
  const { data: patients = [] } = usePatients();
  const { data: protocols = [] } = useProtocols();

  if (!reportType) return null;

  const showDateRange = dateReports.includes(reportType);
  const showPatient = patientReports.includes(reportType);
  const showBatch = batchReports.includes(reportType);
  const showCategory = categoryReports.includes(reportType);
  const showItemType = itemTypeReports.includes(reportType);
  const showProtocol = protocolReports.includes(reportType);
  const showMovementType = reportType === "stock_movements";
  const showAuditEntity = reportType === "audit_log";

  return (
    <div className="card p-6 mb-8 bg-gray-50 border-dashed">
      <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-800">
        <Filter size={18} /> Filtros de Relatorio
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {showDateRange && (
          <>
            <div className="form-group">
              <label className="form-label">Data Inicial</label>
              <input type="date" className="form-control" value={filter.startDate || ""} onChange={event => setFilter({ ...filter, startDate: event.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Data Final</label>
              <input type="date" className="form-control" value={filter.endDate || ""} onChange={event => setFilter({ ...filter, endDate: event.target.value })} />
            </div>
          </>
        )}

        {showPatient && (
          <div className="form-group">
            <label className="form-label">Paciente</label>
            <select className="form-control" value={filter.patientId || ""} onChange={event => setFilter({ ...filter, patientId: event.target.value })}>
              <option value="">{reportType === "patient_general" ? "Selecione um paciente" : "Todos os pacientes"}</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>{patient.full_name}</option>
              ))}
            </select>
          </div>
        )}

        {showProtocol && (
          <div className="form-group">
            <label className="form-label">Protocolo</label>
            <select className="form-control" value={filter.protocolId || ""} onChange={event => setFilter({ ...filter, protocolId: event.target.value })}>
              <option value="">Todos os protocolos</option>
              {protocols.map(protocol => (
                <option key={protocol.id} value={protocol.id}>{protocol.name}</option>
              ))}
            </select>
          </div>
        )}

        {showCategory && (
          <div className="form-group">
            <label className="form-label">Categoria de Estoque</label>
            <select className="form-control" value={filter.categoryId || ""} onChange={event => setFilter({ ...filter, categoryId: event.target.value })}>
              <option value="">Todas as categorias</option>
              {options?.categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
        )}

        {showItemType && (
          <div className="form-group">
            <label className="form-label">Tipo de Item</label>
            <select className="form-control" value={filter.itemType || ""} onChange={event => setFilter({ ...filter, itemType: event.target.value as ReportFilter["itemType"] })}>
              <option value="">Todos</option>
              <option value="medication">Medicamentos</option>
              <option value="material">Materiais</option>
            </select>
          </div>
        )}

        {showMovementType && (
          <div className="form-group">
            <label className="form-label">Tipo de Movimentacao</label>
            <select className="form-control" value={filter.movementType || "all"} onChange={event => setFilter({ ...filter, movementType: event.target.value as ReportFilter["movementType"] })}>
              <option value="all">Todas</option>
              <option value="entry">Entradas</option>
              <option value="exit">Saidas manuais/perdas</option>
              <option value="usage">Uso em pacientes</option>
            </select>
          </div>
        )}

        {showAuditEntity && (
          <div className="form-group">
            <label className="form-label">Entidade</label>
            <select className="form-control" value={filter.status || ""} onChange={event => setFilter({ ...filter, status: event.target.value })}>
              <option value="">Todas</option>
              <option value="patient">Paciente</option>
              <option value="inventory_item">Item de estoque</option>
              <option value="inventory_batch">Lote</option>
              <option value="procedure">Aplicacao</option>
              <option value="protocol">Protocolo</option>
              <option value="report">Relatorio</option>
            </select>
          </div>
        )}

        {showBatch && (
          <div className="form-group">
            <label className="form-label">Numero do Lote</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ex: LOTE-1234"
              value={filter.batchNumber || ""}
              onChange={event => setFilter({ ...filter, batchNumber: event.target.value })}
            />
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end border-t border-gray-200 pt-4 mt-2">
        <button className="btn btn-secondary" onClick={onClear}>Limpar Filtros</button>
        <button className="btn btn-primary" onClick={onGenerate}>Visualizar e Exportar</button>
      </div>
    </div>
  );
}
