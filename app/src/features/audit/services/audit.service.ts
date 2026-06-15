import { auditRepository, type AuditLogEntry, type AuditLogFilters, type AuditLogItem } from "../repositories/audit.repository";

export const auditService = {
  async log(entry: AuditLogEntry): Promise<void> {
    return auditRepository.log(entry);
  },

  async findAll(filters?: AuditLogFilters): Promise<AuditLogItem[]> {
    return auditRepository.findAll(filters);
  }
};
