/**
 * usePatients.ts — TanStack Query hooks para Pacientes
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { patientsService } from "../services/patients.service";
import type { PatientFormData } from "../schemas/patient.schema";

export const PATIENTS_QUERY_KEY = ["patients"] as const;

/** Hook: lista de pacientes com busca e filtro */
export function usePatients(search = "", activeOnly = false) {
  return useQuery({
    queryKey: [...PATIENTS_QUERY_KEY, { search, activeOnly }],
    queryFn: () => patientsService.listPatients(search, activeOnly),
    staleTime: 30_000,
  });
}

/** Hook: prontuário completo de um paciente */
export function usePatientRecord(id: string | undefined) {
  return useQuery({
    queryKey: [...PATIENTS_QUERY_KEY, id, "record"],
    queryFn: () => patientsService.getPatientRecord(id!),
    enabled: !!id,
    staleTime: 15_000,
  });
}

/** Mutation: criar paciente */
export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PatientFormData) => patientsService.createPatient(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PATIENTS_QUERY_KEY }),
  });
}

/** Mutation: atualizar paciente */
export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PatientFormData> }) =>
      patientsService.updatePatient(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: PATIENTS_QUERY_KEY }),
  });
}

/** Mutation: inativar paciente */
export function useDeactivatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patientsService.deactivatePatient(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PATIENTS_QUERY_KEY }),
  });
}

/** Mutation: reativar paciente */
export function useReactivatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patientsService.reactivatePatient(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PATIENTS_QUERY_KEY }),
  });
}

import { patientProcedureHistoryService } from "../services/patientProcedureHistory.service";

export function usePatientProcedureHistory(patientId: string | undefined) {
  return useQuery({
    queryKey: [...PATIENTS_QUERY_KEY, patientId, "history"],
    queryFn: () => patientProcedureHistoryService.getPatientProcedureHistory(patientId!),
    enabled: !!patientId,
  });
}

export function usePatientUsedItems(patientId: string | undefined) {
  return useQuery({
    queryKey: [...PATIENTS_QUERY_KEY, patientId, "used-items"],
    queryFn: () => patientProcedureHistoryService.getPatientUsedItems(patientId!),
    enabled: !!patientId,
  });
}

export function usePatientUsedBatches(patientId: string | undefined) {
  return useQuery({
    queryKey: [...PATIENTS_QUERY_KEY, patientId, "used-batches"],
    queryFn: () => patientProcedureHistoryService.getPatientUsedBatches(patientId!),
    enabled: !!patientId,
  });
}

