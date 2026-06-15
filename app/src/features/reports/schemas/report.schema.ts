export interface StockPositionRow {
  item_id: string;
  item_name: string;
  item_type: string;
  category_name: string | null;
  control_unit: string;
  minimum_stock: number;
  current_stock: number;
  active_batches: number;
  next_expiration_date: string | null;
}

export interface StockMovementRow {
  id: string;
  movement_type: "entry" | "exit" | "automatic_exit" | "adjustment" | "loss" | "expired" | "correction";
  created_at: string;
  item_name: string;
  batch_number: string | null;
  control_quantity: number;
  control_unit: string;
  reason: string | null;
  reference_id: string | null;
}

export interface ConsumptionRow {
  item_id: string;
  item_name: string;
  control_unit: string;
  total_consumed: number;
}

export interface TraceabilityRow {
  procedure_id: string;
  performed_at: string;
  patient_name: string;
  protocol_name: string | null;
  item_name: string;
  quantity_used: number;
  control_unit: string;
}

export interface PatientHistoryRow {
  procedure_id: string;
  performed_at: string;
  patient_id: string;
  patient_name: string;
  protocol_name: string | null;
  body_area_name: string | null;
  had_intercurrence: boolean;
  total_items_used: number;
}

export interface DashboardKPIs {
  totalActiveProducts: number;
  lowStockItems: number;
  expiringBatches: number; // proximos 30 dias
  totalProcedures30Days: number;
}

export interface PatientGeneralReportData {
  patient: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    birth_date: string | null;
    notes: string | null;
    alert_notes: string | null;
    created_at: string;
  } | null;
  procedures: {
    id: string;
    performed_at: string;
    protocol_name: string | null;
    body_area_name: string | null;
    status: string;
    evolution_text: string | null;
    had_intercurrence: number;
    intercurrence_description: string | null;
    total_items_used: number;
  }[];
  used_items: {
    item_name: string;
    item_type: string;
    total_quantity: number;
    unit: string;
    batches_used: number;
  }[];
  used_batches: {
    item_name: string;
    batch_number: string | null;
    expiration_date: string | null;
    total_quantity: number;
    unit: string;
  }[];
}

export interface DetailedReportColumn {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
}

export interface DetailedReportSummaryItem {
  label: string;
  value: string | number;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}

export interface DetailedReportData {
  title: string;
  subtitle: string;
  summary: DetailedReportSummaryItem[];
  columns: DetailedReportColumn[];
  rows: Record<string, string | number | null>[];
  notes?: string[];
}

export type ReportType = 
  | "patient_general"
  | "patient_history"
  | "patient_evolutions"
  | "patient_medications"
  | "patient_materials"
  | "patient_batches"
  | "patient_body_areas"
  | "stock_position"
  | "stock_low"
  | "stock_expirations"
  | "stock_expired"
  | "stock_consumption"
  | "stock_movements"
  | "stock_entries"
  | "stock_exits"
  | "batch_by_item"
  | "patients_by_batch"
  | "protocols_list"
  | "protocol_procedures"
  | "audit_log"
  | "labels_generated"
  | null;

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  patientId?: string;
  protocolId?: string;
  medicationId?: string;
  materialId?: string;
  batchNumber?: string;
  supplierId?: string;
  categoryId?: string;
  status?: string;
  administrationRoute?: string;
  bodyArea?: string;
  movementType?: "all" | "entry" | "exit" | "usage";
  itemType?: "medication" | "material" | "";
  userId?: string;
}
