import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { protocolsService, type SaveProtocolInput } from "../services/protocols.service";

export function useProtocols() {
  return useQuery({
    queryKey: ["protocols"],
    queryFn: () => protocolsService.listProtocols(),
  });
}

export function useProtocolWithItems(id: string | null) {
  return useQuery({
    queryKey: ["protocols", id],
    queryFn: () => (id ? protocolsService.getProtocolWithItems(id) : null),
    enabled: !!id,
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: ["evolution_templates"],
    queryFn: () => protocolsService.listTemplates(),
  });
}

export function useSaveProtocol() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SaveProtocolInput) => protocolsService.saveProtocol(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocols"] });
    },
  });
}

export function useDeleteProtocol() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => protocolsService.deleteProtocol(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["protocols"] });
    },
  });
}
