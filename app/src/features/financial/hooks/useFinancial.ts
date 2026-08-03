import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { financialService } from "../services/financial.service";
import type { CashGroupBy, FinancialFilters, FinancialPeriod, PayableInput, PaymentInput, ReceivableInput } from "../types";

function useInvalidateFinancial() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["financial"] }),
      queryClient.invalidateQueries({ queryKey: ["financial-options"] }),
    ]);
  };
}

export function useFinancialOptions() {
  return useQuery({
    queryKey: ["financial-options"],
    queryFn: financialService.getLookupOptions,
  });
}

export function useFinancialDashboard(period: FinancialPeriod) {
  return useQuery({
    queryKey: ["financial", "dashboard", period],
    queryFn: () => financialService.getDashboardSummary(period),
  });
}

export function useReceivables(filters?: FinancialFilters) {
  return useQuery({
    queryKey: ["financial", "receivables", filters],
    queryFn: () => financialService.listReceivables(filters),
  });
}

export function usePayables(filters?: FinancialFilters) {
  return useQuery({
    queryKey: ["financial", "payables", filters],
    queryFn: () => financialService.listPayables(filters),
  });
}

export function useCashFlow(period: FinancialPeriod, groupBy: CashGroupBy) {
  return useQuery({
    queryKey: ["financial", "cash-flow", period, groupBy],
    queryFn: () => financialService.getCashFlow(period, groupBy),
  });
}

export function useFinancialReports(period: FinancialPeriod) {
  return useQuery({
    queryKey: ["financial", "reports", period],
    queryFn: () => financialService.getReports(period),
  });
}

export function useFinancialCategories() {
  return useQuery({
    queryKey: ["financial", "categories"],
    queryFn: financialService.listCategories,
  });
}

export function useCreateReceivable() {
  const invalidate = useInvalidateFinancial();
  return useMutation({
    mutationFn: (data: ReceivableInput) => financialService.createReceivable(data),
    onSuccess: invalidate,
  });
}

export function useUpdateReceivable() {
  const invalidate = useInvalidateFinancial();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReceivableInput }) => financialService.updateReceivable(id, data),
    onSuccess: invalidate,
  });
}

export function usePayReceivable() {
  const invalidate = useInvalidateFinancial();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PaymentInput }) => financialService.payReceivable(id, data),
    onSuccess: invalidate,
  });
}

export function useCancelReceivable() {
  const invalidate = useInvalidateFinancial();
  return useMutation({
    mutationFn: (id: string) => financialService.cancelReceivable(id),
    onSuccess: invalidate,
  });
}

export function useCreatePayable() {
  const invalidate = useInvalidateFinancial();
  return useMutation({
    mutationFn: (data: PayableInput) => financialService.createPayable(data),
    onSuccess: invalidate,
  });
}

export function useUpdatePayable() {
  const invalidate = useInvalidateFinancial();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PayableInput }) => financialService.updatePayable(id, data),
    onSuccess: invalidate,
  });
}

export function usePayPayable() {
  const invalidate = useInvalidateFinancial();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PaymentInput }) => financialService.payPayable(id, data),
    onSuccess: invalidate,
  });
}

export function useCancelPayable() {
  const invalidate = useInvalidateFinancial();
  return useMutation({
    mutationFn: (id: string) => financialService.cancelPayable(id),
    onSuccess: invalidate,
  });
}

export function useCreateFinancialCategory() {
  const invalidate = useInvalidateFinancial();
  return useMutation({
    mutationFn: (data: { name: string; type: string; parentId?: string | null; isActive?: boolean }) => financialService.createCategory(data),
    onSuccess: invalidate,
  });
}

export function useSetFinancialCategoryActive() {
  const invalidate = useInvalidateFinancial();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => financialService.setCategoryActive(id, isActive),
    onSuccess: invalidate,
  });
}
