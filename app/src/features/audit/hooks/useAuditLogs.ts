import { useQuery } from "@tanstack/react-query";
import { auditService } from "../services/audit.service";
import type { AuditLogFilters, AuditLogItem } from "../repositories/audit.repository";

export function useAuditLogs(filters?: AuditLogFilters) {
  return useQuery<AuditLogItem[]>({
    queryKey: ["audit_logs", filters],
    queryFn: () => auditService.findAll(filters),
  });
}
