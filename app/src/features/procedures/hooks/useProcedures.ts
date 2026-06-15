import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { proceduresService, type SaveProcedureInput } from "../services/procedures.service";

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
