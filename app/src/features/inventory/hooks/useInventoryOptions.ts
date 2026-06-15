import { useQuery } from "@tanstack/react-query";
import { inventoryService } from "@/features/inventory/services/inventory.service";

export function useInventoryOptions() {
  return useQuery({
    queryKey: ["inventoryOptions"],
    queryFn: () => inventoryService.getInventoryOptions(),
  });
}
