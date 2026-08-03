import { dbTransaction } from "@/lib/db/sqlite";
import { auditService } from "@/features/audit/services/audit.service";
import { getStoredAuthSession } from "@/features/auth/session";
import { monthlySummaryRepository } from "@/features/monthly-summary/repositories/monthlySummary.repository";
import { financialRepository } from "../repositories/financial.repository";
import { payableSchema, paymentSchema, receivableSchema } from "../schemas/financial.schema";
import type {
  CashFlowRow,
  CashGroupBy,
  FinancialDashboardSummary,
  FinancialFilters,
  FinancialLookupOptions,
  FinancialPeriod,
  FinancialPeriodPreset,
  FinancialReportBundle,
  PayableInput,
  PaymentInput,
  ReceivableInput,
} from "../types";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function todayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function buildFinancialPeriod(
  preset: FinancialPeriodPreset,
  customStartDate?: string,
  customEndDate?: string,
): FinancialPeriod {
  const today = todayLocal();
  let start = new Date(today);
  let end = new Date(today);

  if (preset === "7d") {
    start.setDate(end.getDate() - 6);
  } else if (preset === "30d") {
    start.setDate(end.getDate() - 29);
  } else if (preset === "this_month") {
    start = new Date(today.getFullYear(), today.getMonth(), 1);
    end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  } else if (preset === "previous_month") {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    end = new Date(today.getFullYear(), today.getMonth(), 0);
  } else if (preset === "custom") {
    return {
      preset,
      startDate: customStartDate || isoDate(today),
      endDate: customEndDate || isoDate(today),
    };
  }

  return { preset, startDate: isoDate(start), endDate: isoDate(end) };
}

function currentUserId() {
  return getStoredAuthSession()?.userId ?? null;
}

function marginPercent(revenue: number, margin: number) {
  return revenue > 0 ? (margin / revenue) * 100 : 0;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  return [headers.join(","), ...rows.map(row => headers.map(header => escape(row[header])).join(","))].join("\n");
}

export const financialService = {
  buildPeriod: buildFinancialPeriod,

  async getLookupOptions(): Promise<FinancialLookupOptions> {
    const [
      categories,
      paymentMethods,
      patients,
      suppliers,
      protocols,
      finalizedProcedures,
      inventoryReceipts,
    ] = await Promise.all([
      financialRepository.listCategories(),
      financialRepository.listPaymentMethods(),
      financialRepository.listLookupPatients(),
      financialRepository.listLookupSuppliers(),
      financialRepository.listLookupProtocols(),
      financialRepository.listFinalizedProcedures(),
      financialRepository.listInventoryReceiptsWithoutPayable(),
    ]);

    return { categories, paymentMethods, patients, suppliers, protocols, finalizedProcedures, inventoryReceipts };
  },

  async listCategories() {
    return financialRepository.listCategories();
  },

  async createCategory(input: { name: string; type: string; parentId?: string | null; isActive?: boolean }) {
    const id = await financialRepository.createCategory(input);
    await auditService.log({
      action: "financial_category_created",
      entity_type: "financial_category",
      entity_id: id,
      description: `Categoria financeira criada: ${input.name}`,
      after_data: input,
    });
    return id;
  },

  async setCategoryActive(id: string, isActive: boolean) {
    await financialRepository.setCategoryActive(id, isActive);
  },

  async listReceivables(filters?: FinancialFilters) {
    return financialRepository.listReceivables(filters);
  },

  async listPayables(filters?: FinancialFilters) {
    return financialRepository.listPayables(filters);
  },

  async createReceivable(input: ReceivableInput) {
    const data = receivableSchema.parse({ ...input, createdByUserId: input.createdByUserId ?? currentUserId() });
    const id = await financialRepository.createReceivable(data);
    await auditService.log({
      action: "financial_receivable_created",
      entity_type: "financial_receivable",
      entity_id: id,
      description: `Conta a receber criada: ${data.description}`,
      after_data: data,
    });
    return id;
  },

  async updateReceivable(id: string, input: ReceivableInput) {
    const before = await financialRepository.findReceivable(id);
    const data = receivableSchema.parse(input);
    await financialRepository.updateReceivable(id, data);
    await auditService.log({
      action: "financial_receivable_updated",
      entity_type: "financial_receivable",
      entity_id: id,
      description: `Conta a receber atualizada: ${data.description}`,
      before_data: before,
      after_data: data,
    });
  },

  async cancelReceivable(id: string) {
    const before = await financialRepository.findReceivable(id);
    if (!before) throw new Error("Conta a receber não encontrada.");
    if (Number(before.paid_amount || 0) > 0) {
      throw new Error(
        `Não é possível cancelar: esta conta já possui R$ ${Number(before.paid_amount).toFixed(2)} de pagamento registrado. Estorne o pagamento antes de cancelar.`
      );
    }
    await financialRepository.cancelReceivable(id);
    await auditService.log({
      action: "financial_receivable_cancelled",
      entity_type: "financial_receivable",
      entity_id: id,
      description: "Conta a receber cancelada.",
      before_data: before,
    });
  },

  async payReceivable(id: string, input: PaymentInput) {
    const before = await financialRepository.findReceivable(id);
    if (!before) throw new Error("Conta a receber nao encontrada.");
    const maxPayment = Math.max(0, Number(before.amount) - Number(before.paid_amount || 0));
    const data = paymentSchema.parse({ ...input, createdByUserId: input.createdByUserId ?? currentUserId() });
    if (data.amount > maxPayment + 0.0001) throw new Error("Pagamento maior que o saldo em aberto.");

    await dbTransaction(async () => {
      await financialRepository.createPayment("in", id, data);
      await financialRepository.updateReceivablePaidState(id);
    });

    await auditService.log({
      action: "financial_receivable_paid",
      entity_type: "financial_receivable",
      entity_id: id,
      description: `Recebimento registrado: ${roundMoney(data.amount)}`,
      before_data: before,
      after_data: data,
    });
  },

  async createPayable(input: PayableInput) {
    const data = payableSchema.parse({ ...input, createdByUserId: input.createdByUserId ?? currentUserId() });
    const id = await financialRepository.createPayable(data);
    await auditService.log({
      action: "financial_payable_created",
      entity_type: "financial_payable",
      entity_id: id,
      description: `Conta a pagar criada: ${data.description}`,
      after_data: data,
    });
    return id;
  },

  async updatePayable(id: string, input: PayableInput) {
    const before = await financialRepository.findPayable(id);
    const data = payableSchema.parse(input);
    await financialRepository.updatePayable(id, data);
    await auditService.log({
      action: "financial_payable_updated",
      entity_type: "financial_payable",
      entity_id: id,
      description: `Conta a pagar atualizada: ${data.description}`,
      before_data: before,
      after_data: data,
    });
  },

  async cancelPayable(id: string) {
    const before = await financialRepository.findPayable(id);
    if (!before) throw new Error("Conta a pagar não encontrada.");
    if (Number(before.paid_amount || 0) > 0) {
      throw new Error(
        `Não é possível cancelar: esta conta já possui R$ ${Number(before.paid_amount).toFixed(2)} de pagamento registrado. Estorne o pagamento antes de cancelar.`
      );
    }
    await financialRepository.cancelPayable(id);
    await auditService.log({
      action: "financial_payable_cancelled",
      entity_type: "financial_payable",
      entity_id: id,
      description: "Conta a pagar cancelada.",
      before_data: before,
    });
  },

  async payPayable(id: string, input: PaymentInput) {
    const before = await financialRepository.findPayable(id);
    if (!before) throw new Error("Conta a pagar nao encontrada.");
    const maxPayment = Math.max(0, Number(before.amount) - Number(before.paid_amount || 0));
    const data = paymentSchema.parse({ ...input, createdByUserId: input.createdByUserId ?? currentUserId() });
    if (data.amount > maxPayment + 0.0001) throw new Error("Pagamento maior que o saldo em aberto.");

    await dbTransaction(async () => {
      await financialRepository.createPayment("out", id, data);
      await financialRepository.updatePayablePaidState(id);
    });

    await auditService.log({
      action: "financial_payable_paid",
      entity_type: "financial_payable",
      entity_id: id,
      description: `Pagamento registrado: ${roundMoney(data.amount)}`,
      before_data: before,
      after_data: data,
    });
  },

  async createReceivableForProcedure(input: {
    procedureId: string;
    patientId?: string | null;
    protocolId?: string | null;
    description?: string | null;
    amount: number;
    dueDate?: string | null;
    paymentMethodId?: string | null;
    markAsPaid?: boolean;
  }) {
    if (!input.amount || input.amount <= 0) return null;
    const existing = await financialRepository.findReceivableByProcedureId(input.procedureId);
    if (existing) return existing.id;

    const id = await this.createReceivable({
      patientId: input.patientId ?? null,
      procedureId: input.procedureId,
      protocolId: input.protocolId ?? null,
      categoryId: "fin-cat-income-procedures",
      description: input.description || "Receita de procedimento",
      amount: input.amount,
      dueDate: input.dueDate || isoDate(new Date()),
      paymentMethodId: input.paymentMethodId ?? null,
      notes: "Lancamento gerado na finalizacao do procedimento.",
    });

    if (input.markAsPaid) {
      await this.payReceivable(id, {
        amount: input.amount,
        paidAt: input.dueDate || isoDate(new Date()),
        paymentMethodId: input.paymentMethodId ?? null,
        notes: "Recebimento informado na finalizacao do procedimento.",
      });
    }

    return id;
  },

  async getDashboardSummary(period: FinancialPeriod): Promise<FinancialDashboardSummary> {
    const [receivables, payables, payments, procedureRows, openCounts, materials] = await Promise.all([
      financialRepository.listReceivables({ startDate: period.startDate, endDate: period.endDate, status: "all" }),
      financialRepository.listPayables({ startDate: period.startDate, endDate: period.endDate, status: "all" }),
      financialRepository.getPayments(period.startDate, period.endDate),
      financialRepository.getProcedureFinancialRows(period.startDate, period.endDate),
      financialRepository.getOpenCounts(),
      monthlySummaryRepository.getConsumedMaterials(period.startDate, period.endDate),
    ]);

    let medicationCost = 0;
    let materialCost = 0;
    let totalNeedles = 0;
    const syringesBreakdown = { ml3: 0, ml5: 0, ml10: 0, other: 0 };

    for (const m of materials) {
      if (m.kind === "medication") {
        medicationCost += m.totalCost;
      } else {
        materialCost += m.totalCost;
      }
      if (m.kind === "syringe_3ml") syringesBreakdown.ml3 += m.totalQty;
      else if (m.kind === "syringe_5ml") syringesBreakdown.ml5 += m.totalQty;
      else if (m.kind === "syringe_10ml") syringesBreakdown.ml10 += m.totalQty;
      else if (m.kind === "syringe_other") syringesBreakdown.other += m.totalQty;
      else if (m.kind === "needle") totalNeedles += m.totalQty;
    }

    const totalSyringes = syringesBreakdown.ml3 + syringesBreakdown.ml5 + syringesBreakdown.ml10 + syringesBreakdown.other;

    // Receita "competência" no período (títulos com vencimento no intervalo, exclui cancelados)
    const revenueTotal = roundMoney(
      receivables
        .filter(r => r.status !== "cancelled")
        .reduce((sum, r) => sum + Number(r.amount || 0), 0),
    );
    // Em aberto / vencido: usa status efetivo (inclui parcialmente pago vencido)
    const receivablesOpen = roundMoney(
      receivables
        .filter(r => ["open", "partially_paid"].includes(r.status) || r.effective_status === "overdue")
        .reduce((sum, r) => sum + Math.max(0, Number(r.amount || 0) - Number(r.paid_amount || 0)), 0),
    );
    const receivablesOverdue = roundMoney(
      receivables
        .filter(r => r.effective_status === "overdue")
        .reduce((sum, r) => sum + Math.max(0, Number(r.amount || 0) - Number(r.paid_amount || 0)), 0),
    );
    const expensesPaid = roundMoney(payments.filter(p => p.direction === "out").reduce((sum, p) => sum + Number(p.amount || 0), 0));
    const payablesOpen = roundMoney(
      payables
        .filter(p => ["open", "partially_paid"].includes(p.status) || p.effective_status === "overdue")
        .reduce((sum, p) => sum + Math.max(0, Number(p.amount || 0) - Number(p.paid_amount || 0)), 0),
    );
    const realizedIncome = roundMoney(payments.filter(p => p.direction === "in").reduce((sum, p) => sum + Number(p.amount || 0), 0));
    const realizedExpense = expensesPaid;
    const realizedBalance = roundMoney(realizedIncome - realizedExpense);
    const projectedBalance = roundMoney(realizedBalance + receivablesOpen - payablesOpen);

    // Custo e ticket médio a partir dos procedimentos finalizados (não da receita total de títulos)
    const procedureCost = roundMoney(procedureRows.reduce((sum, row) => sum + Number(row.cost || 0), 0));
    const procedureRevenue = roundMoney(procedureRows.reduce((sum, row) => sum + Number(row.revenue || 0), 0));
    const grossProfit = roundMoney(procedureRevenue - procedureCost);
    const grossMargin = marginPercent(procedureRevenue, grossProfit);
    const finalizedCount = procedureRows.length;
    const averageTicket = finalizedCount > 0 ? roundMoney(procedureRevenue / finalizedCount) : 0;

    const protocols = new Map<string, { id: string | null; name: string; revenue: number; cost: number }>();
    const patients = new Map<string, { id: string | null; name: string; revenue: number; procedureCost: number }>();
    for (const row of procedureRows) {
      const protocolKey = row.protocol_id || "none";
      const currentProtocol = protocols.get(protocolKey) || { id: row.protocol_id ?? null, name: row.protocol_name || "Sem protocolo", revenue: 0, cost: 0 };
      currentProtocol.revenue += Number(row.revenue || 0);
      currentProtocol.cost += Number(row.cost || 0);
      protocols.set(protocolKey, currentProtocol);

      const patientKey = row.patient_id || "none";
      const currentPatient = patients.get(patientKey) || { id: row.patient_id ?? null, name: row.patient_name || "Paciente nao informado", revenue: 0, procedureCost: 0 };
      currentPatient.revenue += Number(row.revenue || 0);
      currentPatient.procedureCost += Number(row.cost || 0);
      patients.set(patientKey, currentPatient);
    }

    const topProtocols = [...protocols.values()]
      .map(item => {
        const margin = roundMoney(item.revenue - item.cost);
        return { ...item, revenue: roundMoney(item.revenue), cost: roundMoney(item.cost), margin, marginPercent: marginPercent(item.revenue, margin) };
      })
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 5);

    const topPatients = [...patients.values()]
      .map(item => ({ ...item, revenue: roundMoney(item.revenue), procedureCost: roundMoney(item.procedureCost) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const alerts: FinancialDashboardSummary["alerts"] = [];
    if (Number(openCounts.overdue_receivables) > 0) {
      alerts.push({ tone: "danger", title: "Recebimentos vencidos", description: `${openCounts.overdue_receivables} conta(s) a receber vencida(s).` });
    }
    if (Number(openCounts.overdue_payables) > 0) {
      alerts.push({ tone: "warning", title: "Pagamentos vencidos", description: `${openCounts.overdue_payables} conta(s) a pagar vencida(s).` });
    }
    if (Number(openCounts.items_without_cost) > 0) {
      alerts.push({ tone: "warning", title: "Itens sem custo", description: `${openCounts.items_without_cost} item(ns) com saldo nao possuem custo cadastrado.` });
    }

    return {
      revenueTotal,
      receivablesOpen,
      receivablesOverdue,
      expensesPaid,
      payablesOpen,
      projectedBalance,
      realizedBalance,
      grossProfit,
      grossMargin,
      averageTicket,
      procedureCost: roundMoney(procedureCost),
      medicationCost: roundMoney(medicationCost),
      materialCost: roundMoney(materialCost),
      itemsWithoutCostCount: Number(openCounts.items_without_cost || 0),
      overdueReceivablesCount: Number(openCounts.overdue_receivables || 0),
      overduePayablesCount: Number(openCounts.overdue_payables || 0),
      totalSyringes,
      syringesBreakdown,
      totalNeedles,
      topProtocols,
      topPatients,
      alerts,
    };
  },

  async getCashFlow(period: FinancialPeriod, groupBy: CashGroupBy = "day"): Promise<CashFlowRow[]> {
    const rows = await financialRepository.getCashFlowSourceRows(period.startDate, period.endDate);
    const buckets = new Map<string, CashFlowRow>();
    const getKey = (dateString: string) => {
      const date = new Date(`${dateString}T00:00:00`);
      if (groupBy === "month") return dateString.slice(0, 7);
      if (groupBy === "week") {
        const firstDay = new Date(date.getFullYear(), 0, 1);
        const week = Math.ceil((((date.getTime() - firstDay.getTime()) / 86400000) + firstDay.getDay() + 1) / 7);
        return `${date.getFullYear()}-S${String(week).padStart(2, "0")}`;
      }
      return dateString;
    };

    for (const row of rows) {
      const key = getKey(row.movement_date);
      const bucket = buckets.get(key) || {
        period: key,
        realizedIncome: 0,
        realizedExpense: 0,
        projectedIncome: 0,
        projectedExpense: 0,
        dailyBalance: 0,
        accumulatedBalance: 0,
      };
      const amount = Number(row.amount || 0);
      if (row.row_type === "realized_income") bucket.realizedIncome += amount;
      if (row.row_type === "realized_expense") bucket.realizedExpense += amount;
      if (row.row_type === "projected_income") bucket.projectedIncome += amount;
      if (row.row_type === "projected_expense") bucket.projectedExpense += amount;
      buckets.set(key, bucket);
    }

    let accumulated = 0;
    return [...buckets.values()].sort((a, b) => a.period.localeCompare(b.period)).map(row => {
      const dailyBalance = roundMoney(row.realizedIncome - row.realizedExpense + row.projectedIncome - row.projectedExpense);
      accumulated = roundMoney(accumulated + dailyBalance);
      return {
        ...row,
        realizedIncome: roundMoney(row.realizedIncome),
        realizedExpense: roundMoney(row.realizedExpense),
        projectedIncome: roundMoney(row.projectedIncome),
        projectedExpense: roundMoney(row.projectedExpense),
        dailyBalance,
        accumulatedBalance: accumulated,
      };
    });
  },

  async getReports(period: FinancialPeriod): Promise<FinancialReportBundle> {
    const [procedureRows, expenses, openReceivables, openPayables, overdueReceivables, consumedMaterials] = await Promise.all([
      financialRepository.getProcedureFinancialRows(period.startDate, period.endDate),
      financialRepository.getExpenseRows(period.startDate, period.endDate),
      financialRepository.listReceivables({ status: "open" }),
      financialRepository.listPayables({ status: "open" }),
      financialRepository.listReceivables({ status: "overdue" }),
      monthlySummaryRepository.getConsumedMaterials(period.startDate, period.endDate),
    ]);

    let medicationCost = 0;
    let materialCost = 0;
    for (const m of consumedMaterials) {
      if (m.kind === "medication") medicationCost += m.totalCost;
      else materialCost += m.totalCost;
    }

    const revenue = roundMoney(procedureRows.reduce((sum, row) => sum + Number(row.revenue || 0), 0));
    const procedureCosts = roundMoney(procedureRows.reduce((sum, row) => sum + Number(row.cost || 0), 0));
    const grossProfit = roundMoney(revenue - procedureCosts);
    const operatingExpenses = roundMoney(expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0));
    const netResult = roundMoney(grossProfit - operatingExpenses);

    const revenueByProtocol = new Map<string, { protocol_id: string | null; protocol_name: string; revenue: number; cost: number; margin: number }>();
    const revenueByPatient = new Map<string, { patient_id: string | null; patient_name: string; revenue: number; cost: number; margin: number }>();
    const expensesByCategory = new Map<string, { category_id: string | null; category_name: string; amount: number }>();

    for (const row of procedureRows) {
      const protocolKey = row.protocol_id || "none";
      const protocol = revenueByProtocol.get(protocolKey) || { protocol_id: row.protocol_id ?? null, protocol_name: row.protocol_name || "Sem protocolo", revenue: 0, cost: 0, margin: 0 };
      protocol.revenue += Number(row.revenue || 0);
      protocol.cost += Number(row.cost || 0);
      protocol.margin = protocol.revenue - protocol.cost;
      revenueByProtocol.set(protocolKey, protocol);

      const patientKey = row.patient_id || "none";
      const patient = revenueByPatient.get(patientKey) || { patient_id: row.patient_id ?? null, patient_name: row.patient_name || "Paciente nao informado", revenue: 0, cost: 0, margin: 0 };
      patient.revenue += Number(row.revenue || 0);
      patient.cost += Number(row.cost || 0);
      patient.margin = patient.revenue - patient.cost;
      revenueByPatient.set(patientKey, patient);
    }

    for (const row of expenses) {
      const key = row.category_id || "none";
      const category = expensesByCategory.get(key) || { category_id: row.category_id ?? null, category_name: row.category_name || "Sem categoria", amount: 0 };
      category.amount += Number(row.amount || 0);
      expensesByCategory.set(key, category);
    }

    return {
      dre: {
        revenue,
        procedureCosts,
        medicationCost: roundMoney(medicationCost),
        materialCost: roundMoney(materialCost),
        grossProfit,
        operatingExpenses,
        netResult,
        grossMargin: marginPercent(revenue, grossProfit),
        netMargin: marginPercent(revenue, netResult),
      },
      revenueByProtocol: [...revenueByProtocol.values()].map(row => ({ ...row, revenue: roundMoney(row.revenue), cost: roundMoney(row.cost), margin: roundMoney(row.margin) })).sort((a, b) => b.revenue - a.revenue),
      revenueByPatient: [...revenueByPatient.values()].map(row => ({ ...row, revenue: roundMoney(row.revenue), cost: roundMoney(row.cost), margin: roundMoney(row.margin) })).sort((a, b) => b.revenue - a.revenue),
      expensesByCategory: [...expensesByCategory.values()].map(row => ({ ...row, amount: roundMoney(row.amount) })).sort((a, b) => b.amount - a.amount),
      consumedMaterials: consumedMaterials.map(m => ({
        itemId: m.itemId,
        itemName: m.itemName,
        kind: m.kind,
        totalQty: m.totalQty,
        unit: m.unit,
        totalCost: roundMoney(m.totalCost),
      })),
      openReceivables,
      openPayables,
      overdueReceivables,
    };
  },

  exportReportCsv(report: FinancialReportBundle, section: "protocols" | "patients" | "expenses") {
    if (section === "protocols") return toCsv(report.revenueByProtocol as any);
    if (section === "patients") return toCsv(report.revenueByPatient as any);
    return toCsv(report.expensesByCategory as any);
  },
};
