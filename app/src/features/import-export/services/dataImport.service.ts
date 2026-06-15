import { auditService } from "@/features/audit/services/audit.service";
import { getStoredAuthSession } from "@/features/auth/session";
import { backupService } from "@/features/backup/services/backup.service";
import { dataImportRepository } from "../repositories/dataImport.repository";
import type {
  DataImportJob,
  DataImportRow,
  ImportAction,
  ImportApplyResult,
  ImportType,
  ImportValidationResult,
  ParsedCsv,
} from "../types/importExport.types";
import { duplicateDetectionService } from "./duplicateDetection.service";
import { importMappingService } from "./importMapping.service";

const REQUIRED_FIELDS: Record<ImportType, string[]> = {
  patients: ["full_name"],
  medications: ["name"],
  materials: ["name"],
  suppliers: ["name"],
  inventory: ["item_name", "batch_number", "quantity"],
  protocols: ["name"],
};

function normalizeDate(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const brazilian = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (brazilian) {
    const [, day, month, year] = brazilian;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  }

  return raw;
}

function parseFlexibleNumber(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeMapped(importType: ImportType, mapped: Record<string, string | number | null>) {
  const normalized: Record<string, string | number | null> = {};
  for (const [field, value] of Object.entries(mapped)) {
    normalized[field] = typeof value === "string" ? normalizeText(value) : value;
  }

  for (const field of ["birth_date", "expiration_date", "manufacturing_date"]) {
    if (field in normalized) normalized[field] = normalizeDate(normalized[field]);
  }

  for (const field of ["quantity", "minimum_stock"]) {
    if (field in normalized) normalized[field] = parseFlexibleNumber(normalized[field]);
  }

  if (importType === "inventory" && !normalized.item_type) normalized.item_type = "material";
  return normalized;
}

function validateEmail(value: unknown): boolean {
  const email = String(value ?? "").trim();
  return !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildInternalDuplicateKey(importType: ImportType, mapped: Record<string, string | number | null>): string {
  if (importType === "patients") {
    return [
      String(mapped.email ?? "").toLowerCase(),
      String(mapped.phone ?? "").replace(/\D/g, ""),
      String(mapped.full_name ?? "").toLowerCase(),
      String(mapped.birth_date ?? ""),
    ].filter(Boolean).join("|");
  }

  if (importType === "inventory") {
    return `${String(mapped.item_name ?? "").toLowerCase()}|${String(mapped.batch_number ?? "").toLowerCase()}|${String(mapped.expiration_date ?? "")}`;
  }

  return String(mapped.name ?? "").toLowerCase();
}

async function createFileHash(fileName: string, parsed: ParsedCsv) {
  const content = JSON.stringify({ fileName, headers: parsed.headers, rows: parsed.rows });
  const bytes = new TextEncoder().encode(content);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export const dataImportService = {
  async validateParsedCsv(input: {
    importType: ImportType;
    fileName: string;
    parsed: ParsedCsv;
    mapping: Record<string, string>;
  }): Promise<ImportValidationResult> {
    const session = getStoredAuthSession();
    const existingPatients = input.importType === "patients"
      ? await dataImportRepository.listPatientsForDuplicateDetection()
      : [];
    const internalKeys = new Map<string, number>();

    const rows: DataImportRow[] = input.parsed.rows.map((rawRow, index) => {
      const mapped = normalizeMapped(input.importType, importMappingService.applyMapping(rawRow, input.mapping));
      const validationErrors: string[] = [];

      for (const field of REQUIRED_FIELDS[input.importType]) {
        if (mapped[field] === null || mapped[field] === undefined || String(mapped[field]).trim() === "") {
          validationErrors.push(`Campo obrigatorio ausente: ${field}`);
        }
      }

      if ("email" in mapped && !validateEmail(mapped.email)) {
        validationErrors.push("E-mail invalido");
      }

      if ("quantity" in mapped && (mapped.quantity === null || Number(mapped.quantity) <= 0)) {
        validationErrors.push("Quantidade deve ser maior que zero");
      }

      if ("minimum_stock" in mapped && mapped.minimum_stock !== null && Number(mapped.minimum_stock) < 0) {
        validationErrors.push("Estoque minimo nao pode ser negativo");
      }

      const internalKey = buildInternalDuplicateKey(input.importType, mapped);
      if (internalKey) {
        const firstRow = internalKeys.get(internalKey);
        if (firstRow) {
          validationErrors.push(`Possivel duplicidade dentro do CSV com a linha ${firstRow}`);
        } else {
          internalKeys.set(internalKey, index + 2);
        }
      }

      const duplicateCandidates = input.importType === "patients"
        ? duplicateDetectionService.findPatientDuplicates(mapped, existingPatients)
        : [];
      const strongestDuplicate = duplicateCandidates[0] ?? null;

      let status: DataImportRow["status"] = "valid";
      let selectedAction: ImportAction = "create";
      let targetEntityId: string | null = null;

      if (validationErrors.length > 0) {
        status = "invalid";
        selectedAction = "ignore";
      } else if (strongestDuplicate) {
        status = "duplicate";
        selectedAction = strongestDuplicate.score >= 80 ? "update" : "manual_review";
        targetEntityId = strongestDuplicate.entityId;
      }

      return {
        id: crypto.randomUUID(),
        importJobId: "",
        rowNumber: index + 2,
        rawJson: rawRow,
        mappedJson: mapped,
        validationErrorsJson: validationErrors,
        duplicateCandidatesJson: duplicateCandidates,
        selectedAction,
        status,
        targetEntityId,
      };
    });

    const summary = {
      totalRows: rows.length,
      validRows: rows.filter(row => row.status === "valid" || row.status === "duplicate").length,
      invalidRows: rows.filter(row => row.status === "invalid").length,
      duplicatedRows: rows.filter(row => row.duplicateCandidatesJson.length > 0).length,
      createCount: rows.filter(row => row.selectedAction === "create").length,
      updateCount: rows.filter(row => row.selectedAction === "update").length,
      reviewCount: rows.filter(row => row.selectedAction === "manual_review").length,
      skippedCount: rows.filter(row => row.selectedAction === "ignore").length,
    };

    const jobId = await dataImportRepository.createJob({
      importType: input.importType,
      fileName: input.fileName,
      fileHash: await createFileHash(input.fileName, input.parsed),
      mapping: input.mapping,
      rows,
      summary,
      userId: session?.userId ?? null,
    });

    const rowsWithJob = rows.map(row => ({ ...row, importJobId: jobId }));
    await auditService.log({
      action: "data_import_validated",
      entity_type: "data_import",
      entity_id: jobId,
      description: `CSV validado para importacao de ${input.importType}`,
      after_data: summary,
      user_id: session?.userId ?? null,
    });

    return {
      jobId,
      importType: input.importType,
      fileName: input.fileName,
      headers: input.parsed.headers,
      mapping: input.mapping,
      rows: rowsWithJob,
      summary,
    };
  },

  async applyValidatedImport(result: ImportValidationResult): Promise<ImportApplyResult> {
    const session = getStoredAuthSession();
    const rows = result.rows.map(row => ({ ...row, importJobId: result.jobId }));

    try {
      const applied = await dataImportRepository.applyImport({
        jobId: result.jobId,
        importType: result.importType,
        rows,
        backupPath: "",
        userId: session?.userId ?? null,
      });

      await auditService.log({
        action: "data_import_applied",
        entity_type: "data_import",
        entity_id: result.jobId,
        description: `Importacao CSV concluida para ${result.importType}`,
        after_data: applied,
        user_id: session?.userId ?? null,
      });

      return applied;
    } catch (error) {
      await dataImportRepository.updateJobStatus(result.jobId, "failed");
      await auditService.log({
        action: "data_import_failed",
        entity_type: "data_import",
        entity_id: result.jobId,
        description: error instanceof Error ? error.message : String(error),
        user_id: session?.userId ?? null,
      });
      throw error;
    }
  },

  async listJobs(limit = 20): Promise<DataImportJob[]> {
    return dataImportRepository.listJobs(limit);
  },
};
