export type ImportType = "patients" | "medications" | "materials" | "suppliers" | "inventory" | "protocols";
export type ImportJobStatus =
  | "draft"
  | "parsed"
  | "validated"
  | "ready_to_import"
  | "importing"
  | "completed"
  | "completed_with_errors"
  | "failed"
  | "cancelled";

export type ImportAction = "create" | "update" | "merge" | "ignore" | "manual_review";
export type ImportRowStatus = "pending" | "valid" | "invalid" | "duplicate" | "imported" | "error" | "skipped";

export interface ColumnMappingSuggestion {
  csvHeader: string;
  suggestedField: string | null;
  confidence: number;
}

export interface DuplicateCandidate {
  entityId: string;
  score: number;
  matchedFields: string[];
  divergentFields: Record<string, { current: unknown; imported: unknown }>;
  entityData: Record<string, unknown>;
}

export interface DataImportRow {
  id: string;
  importJobId: string;
  rowNumber: number;
  rawJson: Record<string, string>;
  mappedJson: Record<string, string | number | null>;
  validationErrorsJson: string[];
  duplicateCandidatesJson: DuplicateCandidate[];
  selectedAction: ImportAction;
  status: ImportRowStatus;
  targetEntityId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DataImportJob {
  id: string;
  clinicId: string;
  importType: ImportType;
  fileName: string | null;
  fileHash: string | null;
  status: ImportJobStatus;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicatedRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  mergedCount: number;
  errorCount: number;
  mappingJson: Record<string, string> | null;
  summaryJson: unknown;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt?: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: string;
  errors: string[];
}

export interface ImportValidationResult {
  jobId: string;
  importType: ImportType;
  fileName: string;
  headers: string[];
  rows: DataImportRow[];
  mapping: Record<string, string>;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicatedRows: number;
    createCount: number;
    updateCount: number;
    reviewCount: number;
    skippedCount: number;
  };
}

export interface ImportApplyResult {
  jobId: string;
  backupPath: string;
  created: number;
  updated: number;
  merged: number;
  skipped: number;
  errors: number;
}

export interface PatientMergeInput {
  primaryPatientId: string;
  mergedPatientId: string;
  reason: string;
}
