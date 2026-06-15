import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { evolutionTemplatesService } from "../services/evolutionTemplates.service";
import type { EvolutionTemplateFormData } from "../schemas/protocol.schema";

export function useEvolutionTemplates() {
  return useQuery({
    queryKey: ["evolution_templates"],
    queryFn: () => evolutionTemplatesService.listAll(),
  });
}

export function useSaveEvolutionTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EvolutionTemplateFormData) => evolutionTemplatesService.save(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution_templates"] });
    },
  });
}

export function useDeleteEvolutionTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => evolutionTemplatesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evolution_templates"] });
    },
  });
}
