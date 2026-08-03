import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { proceduresService, type SaveProcedureInput } from "../services/procedures.service";
import { protocolsRepository } from "@/features/protocols/repositories/protocols.repository";

export function useProcedures() {
  return useQuery({
    queryKey: ["procedures"],
    queryFn: () => proceduresService.listProcedures(),
  });
}

export function useProcedureWithItems(id: string | null) {
  return useQuery({
    queryKey: ["procedures", id],
    queryFn: () => (id ? proceduresService.getProcedureWithItems(id) : null),
    enabled: !!id,
  });
}

export function useSaveDraftProcedure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SaveProcedureInput) => proceduresService.saveDraft(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedures"] });
    },
  });
}

export function useFinalizeProcedure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SaveProcedureInput) => proceduresService.finalizeProcedure(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedures"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

/** Carrega os itens (medicamentos/materiais) cadastrados em um protocolo */
export function useProtocolItems(protocolId: string | null | undefined) {
  return useQuery({
    queryKey: ["protocol-items", protocolId],
    queryFn: () => protocolsRepository.listItems(protocolId!),
    enabled: !!protocolId,
    staleTime: 60_000, // cache por 1 minuto — protocolos mudam pouco
  });
}
