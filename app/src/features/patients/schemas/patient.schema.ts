/**
 * patient.schema.ts
 * Schemas Zod para validação de Pacientes.
 */
import { z } from "zod";

export const patientSchema = z.object({
  full_name: z
    .string()
    .min(2, "Nome deve ter ao menos 2 caracteres")
    .max(200, "Nome muito longo"),
  phone: z
    .string()
    .max(20, "Telefone inválido")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("E-mail inválido")
    .optional()
    .or(z.literal("")),
  birth_date: z
    .string()
    .optional()
    .or(z.literal("")),
  document: z
    .string()
    .max(50, "Documento muito longo")
    .optional()
    .or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  alert_notes: z.string().max(1000).optional().or(z.literal("")),
  is_active: z.boolean().default(true),
});

export type PatientFormInput = z.input<typeof patientSchema>;
export type PatientFormData = z.output<typeof patientSchema>;

export interface Patient {
  id: string;
  clinic_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  birth_date: string | null;
  notes: string | null;
  alert_notes: string | null;
  is_active: number; // SQLite returns 0|1
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  merged_into_patient_id?: string | null;
  merged_at?: string | null;
  merged_by_user_id?: string | null;
  merge_status?: string | null;
  // Computed fields (from JOINs)
  total_procedures?: number;
  last_procedure_date?: string | null;
  last_protocol_name?: string | null;
}

export interface PatientProcedureHistoryItem {
  id: string; // procedureId
  patient_id: string;
  performed_at: string;
  finalized_at: string | null;
  status: string;
  protocol_name: string | null;
  route_name: string | null;
  route_code: string | null;
  body_area_name: string | null;
  body_area_slug: string | null;
  body_area_svg_region_id: string | null;
  body_area_side: string | null;
  body_area_region: string | null;
  body_area_id?: string | null;
  professional_name: string | null;
  evolution_text: string | null;
  had_intercurrence: number;
  intercurrence_description: string | null;
  notes: string | null;
  appointment_id: string | null;
  application_plan_id: string | null;
  is_corrected?: number;
  corrected_at?: string | null;
  correction_reason?: string | null;
  items_used: ProcedureItemUsedDetail[];
  total_procedure_cost?: number; // Added in Phase 7
}

export interface ProcedureItemUsedDetail {
  id: string; // procedureItemUsedId
  inventory_item_id: string;
  inventory_batch_id: string | null;
  item_name: string;
  item_type: string;
  quantity_used: number;
  unit: string;
  batch_number: string | null;
  expiration_date: string | null;
  batch_number_snapshot?: string | null;
  expiration_date_snapshot?: string | null;
  manufacture_date: string | null; // some items might not have it natively unless stored in batch
  is_corrected: number;
  unit_cost?: number | null; // Added in Phase 7
  total_cost?: number | null; // Added in Phase 7
}

export interface ProcedureSummary {
  id: string;
  performed_at: string;
  protocol_name: string | null;
  body_area_name: string | null;
  body_area_svg_id: string | null;
  route_name: string | null;
  status: string;
  had_intercurrence: number;
  intercurrence_description: string | null;
  evolution_text: string | null;
}

export interface PatientRecord extends Patient {
  procedures: ProcedureSummary[];
}

export type PatientRecordLoadResult =
  | { status: "found"; patient: PatientRecord; warnings?: string[] }
  | { status: "partial"; patient: PatientRecord; warnings: string[] }
  | { status: "not_found" }
  | { status: "deleted"; patient?: PatientRecord }
  | { status: "merged"; redirectPatientId: string };
