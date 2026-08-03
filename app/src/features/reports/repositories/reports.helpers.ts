import type {
  DetailedReportColumn,
  DetailedReportData,
  ReportFilter,
} from "../schemas/report.schema";

export const CLINIC_ID = "ana-morong-clinic";

export type ReportRow = Record<string, string | number | null>;

export const itemTypeLabel: Record<string, string> = {
  medication: "Medicamento",
  material: "Material",
  equipment: "Equipamento",
  other: "Outro",
};

export const movementTypeLabels: Record<string, string> = {
  entry: "Entrada",
  exit: "Saida",
  automatic_exit: "Uso em paciente",
  adjustment: "Ajuste",
  loss: "Perda",
  expired: "Vencido",
  correction: "Correcao",
};

export function addDateRange(
  conditions: string[],
  params: unknown[],
  column: string,
  filter: ReportFilter
) {
  if (filter.startDate) {
    conditions.push(`date(${column}) >= date(?)`);
    params.push(filter.startDate);
  }
  if (filter.endDate) {
    conditions.push(`date(${column}) <= date(?)`);
    params.push(filter.endDate);
  }
}

export function addPatientFilter(conditions: string[], params: unknown[], alias: string, filter: ReportFilter) {
  if (filter.patientId) {
    conditions.push(`${alias}.patient_id = ?`);
    params.push(filter.patientId);
  }
}

export function addInventoryFilters(conditions: string[], params: unknown[], filter: ReportFilter) {
  if (filter.categoryId) {
    conditions.push("i.category_id = ?");
    params.push(filter.categoryId);
  }
  if (filter.itemType) {
    conditions.push("i.item_type = ?");
    params.push(filter.itemType);
  }
  if (filter.medicationId) {
    conditions.push("i.id = ?");
    params.push(filter.medicationId);
  }
  if (filter.materialId) {
    conditions.push("i.id = ?");
    params.push(filter.materialId);
  }
}

export function periodSubtitle(filter: ReportFilter) {
  const start = filter.startDate || "inicio";
  const end = filter.endDate || "hoje";
  return `Periodo: ${start} ate ${end}`;
}

export function buildReport(
  title: string,
  subtitle: string,
  columns: DetailedReportColumn[],
  rows: ReportRow[],
  notes?: string[]
): DetailedReportData {
  return {
    title,
    subtitle,
    columns,
    rows,
    summary: [
      { label: "Registros", value: rows.length, tone: rows.length ? "info" : "neutral" },
    ],
    notes,
  };
}
