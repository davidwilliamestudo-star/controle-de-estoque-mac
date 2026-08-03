export type FinancialStatus = "open" | "paid" | "overdue" | "cancelled" | "partially_paid";
export type FinancialCategoryType = "income" | "expense" | "both";
export type CashGroupBy = "day" | "week" | "month";
export type FinancialPeriodPreset = "today" | "7d" | "30d" | "this_month" | "previous_month" | "custom";

export interface FinancialPeriod {
  preset: FinancialPeriodPreset;
  startDate: string;
  endDate: string;
}

export interface FinancialCategory {
  id: string;
  clinic_id: string;
  name: string;
  type: FinancialCategoryType;
  parent_id: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FinancialPaymentMethod {
  id: string;
  clinic_id: string;
  name: string;
  type: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface FinancialReceivable {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  procedure_id: string | null;
  protocol_id: string | null;
  category_id: string | null;
  description: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  paid_at: string | null;
  payment_method_id: string | null;
  status: FinancialStatus;
  effective_status: FinancialStatus;
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  patient_name?: string | null;
  protocol_name?: string | null;
  category_name?: string | null;
  payment_method_name?: string | null;
}

export interface FinancialPayable {
  id: string;
  clinic_id: string;
  supplier_id: string | null;
  inventory_receipt_id: string | null;
  category_id: string | null;
  description: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  paid_at: string | null;
  payment_method_id: string | null;
  status: FinancialStatus;
  effective_status: FinancialStatus;
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  supplier_name?: string | null;
  category_name?: string | null;
  payment_method_name?: string | null;
  invoice_number?: string | null;
}

export interface FinancialPayment {
  id: string;
  direction: "in" | "out";
  receivable_id: string | null;
  payable_id: string | null;
  amount: number;
  paid_at: string;
  payment_method_id: string | null;
  notes: string | null;
}

export interface FinancialDashboardSummary {
  revenueTotal: number;
  receivablesOpen: number;
  receivablesOverdue: number;
  expensesPaid: number;
  payablesOpen: number;
  projectedBalance: number;
  realizedBalance: number;
  grossProfit: number;
  grossMargin: number;
  averageTicket: number;
  procedureCost: number;
  medicationCost: number;
  materialCost: number;
  itemsWithoutCostCount: number;
  overdueReceivablesCount: number;
  overduePayablesCount: number;
  totalSyringes: number;
  syringesBreakdown: { ml3: number; ml5: number; ml10: number; other: number };
  totalNeedles: number;
  topProtocols: Array<{ id: string | null; name: string; revenue: number; cost: number; margin: number; marginPercent: number }>;
  topPatients: Array<{ id: string | null; name: string; revenue: number; procedureCost: number }>;
  alerts: Array<{ tone: "warning" | "danger" | "info"; title: string; description: string }>;
}

export interface CashFlowRow {
  period: string;
  realizedIncome: number;
  realizedExpense: number;
  projectedIncome: number;
  projectedExpense: number;
  dailyBalance: number;
  accumulatedBalance: number;
}

export interface FinancialReportBundle {
  dre: {
    revenue: number;
    procedureCosts: number;
    medicationCost: number;
    materialCost: number;
    grossProfit: number;
    operatingExpenses: number;
    netResult: number;
    grossMargin: number;
    netMargin: number;
  };
  revenueByProtocol: Array<{ protocol_id: string | null; protocol_name: string; revenue: number; cost: number; margin: number }>;
  revenueByPatient: Array<{ patient_id: string | null; patient_name: string; revenue: number; cost: number; margin: number }>;
  expensesByCategory: Array<{ category_id: string | null; category_name: string; amount: number }>;
  consumedMaterials: Array<{ itemId: string; itemName: string; kind: string; totalQty: number; unit: string; totalCost: number }>;
  openReceivables: FinancialReceivable[];
  openPayables: FinancialPayable[];
  overdueReceivables: FinancialReceivable[];
}

export interface FinancialLookupOptions {
  categories: FinancialCategory[];
  paymentMethods: FinancialPaymentMethod[];
  patients: Array<{ id: string; full_name: string }>;
  suppliers: Array<{ id: string; name: string }>;
  protocols: Array<{ id: string; name: string }>;
  finalizedProcedures: Array<{ id: string; patient_id: string; patient_name: string; protocol_id: string | null; protocol_name: string | null; finalized_at: string | null; estimated_cost: number }>;
  inventoryReceipts: Array<{ id: string; supplier_id: string | null; supplier_name: string | null; invoice_number: string | null; entry_date: string; total_cost: number }>;
}

export interface ReceivableInput {
  patientId?: string | null;
  procedureId?: string | null;
  protocolId?: string | null;
  categoryId?: string | null;
  description: string;
  amount: number;
  dueDate: string;
  paymentMethodId?: string | null;
  notes?: string | null;
  createdByUserId?: string | null;
}

export interface PayableInput {
  supplierId?: string | null;
  inventoryReceiptId?: string | null;
  categoryId?: string | null;
  description: string;
  amount: number;
  dueDate: string;
  paymentMethodId?: string | null;
  notes?: string | null;
  createdByUserId?: string | null;
}

export interface PaymentInput {
  amount: number;
  paidAt: string;
  paymentMethodId?: string | null;
  notes?: string | null;
  createdByUserId?: string | null;
}

export interface FinancialFilters {
  status?: FinancialStatus | "all";
  search?: string;
  startDate?: string;
  endDate?: string;
  patientId?: string;
  supplierId?: string;
  categoryId?: string;
  paymentMethodId?: string;
}
