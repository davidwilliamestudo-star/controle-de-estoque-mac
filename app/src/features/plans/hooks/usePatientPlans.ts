/**
 * usePatientPlans.ts
 * TanStack Query hooks para gerenciamento de planos Saude 360,
 * esteira de renovacao, funil de follow-up e pausas.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  patientPlansRepository,
  type PatientPlanWithView,
  type CreateProposalInput,
  type AddFollowupInput,
} from "../repositories/patientPlans.repository";

export const PLANS_QUERY_KEY = ["patient_plans"] as const;

/** Hook: busca o plano ativo com visao em tempo real de um paciente */
export function useActivePatientPlan(patientId: string | null | undefined) {
  return useQuery({
    queryKey: [...PLANS_QUERY_KEY, "active", patientId],
    queryFn: () => (patientId ? patientPlansRepository.getActiveForPatient(patientId) : null),
    enabled: Boolean(patientId),
    staleTime: 10_000,
  });
}

/** Hook: lista todos os planos e historico de propostas de um paciente */
export function usePatientPlans(patientId: string | null | undefined) {
  return useQuery({
    queryKey: [...PLANS_QUERY_KEY, "by_patient", patientId],
    queryFn: () => (patientId ? patientPlansRepository.listByPatient(patientId) : []),
    enabled: Boolean(patientId),
    staleTime: 15_000,
  });
}

/** Hook: fila do funil de follow-up (propostas abertas / negociacao) */
export function useFollowupQueue() {
  return useQuery({
    queryKey: [...PLANS_QUERY_KEY, "followup_queue"],
    queryFn: () => patientPlansRepository.listFollowupQueue(),
    staleTime: 15_000,
  });
}

/** Hook: esteira de renovacao antecipada (planos a 14 dias do termino) */
export function useRenewalQueue() {
  return useQuery({
    queryKey: [...PLANS_QUERY_KEY, "renewal_queue"],
    queryFn: () => patientPlansRepository.listRenewalWindow(),
    staleTime: 30_000,
  });
}

/** Hook agrupado com mutacoes para alteracao de estado dos planos */
export function usePlanMutations() {
  const queryClient = useQueryClient();

  const invalidatePlans = () => {
    queryClient.invalidateQueries({ queryKey: PLANS_QUERY_KEY });
  };

  const createProposal = useMutation({
    mutationFn: (input: CreateProposalInput) => patientPlansRepository.createProposal(input),
    onSuccess: invalidatePlans,
  });

  const confirmPayment = useMutation({
    mutationFn: ({
      planId,
      paidAt,
      receivableId,
    }: {
      planId: string;
      paidAt?: string;
      receivableId?: string;
    }) =>
      patientPlansRepository.confirmPaymentAndActivate(planId, {
        startDate: paidAt,
        receivableId,
      }),
    onSuccess: invalidatePlans,
  });

  const updateProcedures = useMutation({
    mutationFn: ({
      planId,
      newTotal,
      reason,
    }: {
      planId: string;
      newTotal: number;
      reason: string;
    }) => patientPlansRepository.updateIncludedProcedures(planId, newTotal, reason),
    onSuccess: invalidatePlans,
  });

  const addFollowup = useMutation({
    mutationFn: (entry: AddFollowupInput) => patientPlansRepository.addFollowup(entry),
    onSuccess: invalidatePlans,
  });

  const markLost = useMutation({
    mutationFn: ({
      planId,
      reason,
      notes,
    }: {
      planId: string;
      reason: string;
      notes?: string;
    }) => patientPlansRepository.markLost(planId, reason, notes),
    onSuccess: invalidatePlans,
  });

  const reopenLost = useMutation({
    mutationFn: (planId: string) => patientPlansRepository.reopenLost(planId),
    onSuccess: invalidatePlans,
  });

  const pausePlan = useMutation({
    mutationFn: ({
      planId,
      reason,
      fromDate,
    }: {
      planId: string;
      reason?: string;
      fromDate?: string;
    }) => patientPlansRepository.pause(planId, fromDate, reason),
    onSuccess: invalidatePlans,
  });

  const resumePlan = useMutation({
    mutationFn: ({ planId, toDate }: { planId: string; toDate?: string }) =>
      patientPlansRepository.resume(planId, toDate),
    onSuccess: invalidatePlans,
  });

  return {
    createProposal,
    confirmPayment,
    updateProcedures,
    addFollowup,
    markLost,
    reopenLost,
    pausePlan,
    resumePlan,
  };
}
