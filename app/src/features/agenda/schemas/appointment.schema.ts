import { z } from "zod";

export const appointmentSchema = z.object({
  patient_id: z.string().min(1, "Paciente é obrigatório"),
  type: z.enum(["application", "consultation", "return", "other"]),
  appointment_date: z.string().min(1, "Data e hora são obrigatórias"),
  duration_minutes: z.number().int().min(5).max(480).default(30),
  status: z.enum(["scheduled", "confirmed", "done", "missed", "canceled"]).default("scheduled"),
  notes: z.string().max(2000).optional().or(z.literal("")),
  application_plan_id: z.string().optional().or(z.literal("")),
  new_plan_protocol_id: z.string().optional().or(z.literal("")),
  new_plan_route_id: z.string().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.type === "application") {
    if (!data.application_plan_id && (!data.new_plan_protocol_id || !data.new_plan_route_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Para agendamento de aplicação, selecione um plano existente ou crie um novo.",
        path: ["application_plan_id"],
      });
    }
  }
});

export type AppointmentFormInput = z.input<typeof appointmentSchema>;
export type AppointmentFormData = z.output<typeof appointmentSchema>;

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  application_plan_id: string | null;
  type: "application" | "consultation" | "return" | "other";
  appointment_date: string; // ISO format
  duration_minutes: number;
  status: "scheduled" | "confirmed" | "done" | "missed" | "canceled";
  notes: string | null;
  sync_status: "not_synced" | "pending" | "synced" | "failed";
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Computed fields (from JOINs)
  patient_name?: string;
  patient_phone?: string | null;
}
