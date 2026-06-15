import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsService } from "../services/settings.service";
import type { SettingsFormData } from "../schemas/settings.schema";

export function useSettings() {
  return useQuery<SettingsFormData>({
    queryKey: ["settings"],
    queryFn: () => settingsService.getAll(),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SettingsFormData) => settingsService.saveMany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
