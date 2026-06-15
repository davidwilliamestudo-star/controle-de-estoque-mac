import { useQuery } from "@tanstack/react-query";
import { proceduresRepository } from "../repositories/procedures.repository";

export function useBodyAreas() {
  return useQuery({
    queryKey: ["body-areas"],
    queryFn: () => proceduresRepository.listBodyAreas(),
    staleTime: Infinity, // raramente mudam
  });
}

export function useAdministrationRoutes() {
  return useQuery({
    queryKey: ["administration-routes"],
    queryFn: () => proceduresRepository.listAdministrationRoutes(),
    staleTime: Infinity,
  });
}

export function useBatchesForItem(itemId: string | null | undefined) {
  return useQuery({
    queryKey: ["batches-for-item", itemId],
    queryFn: () => proceduresRepository.listBatchesForItem(itemId!),
    enabled: !!itemId,
  });
}

export function useProtocolRouteId(protocolId: string | null | undefined) {
  return useQuery({
    queryKey: ["protocol-route", protocolId],
    queryFn: () => proceduresRepository.getProtocolRouteId(protocolId!),
    enabled: !!protocolId,
  });
}

export function usePatientProcedures(patientId: string | null | undefined) {
  return useQuery({
    queryKey: ["patient-procedures", patientId],
    queryFn: () => proceduresRepository.listPatientProcedures(patientId!),
    enabled: !!patientId,
  });
}
