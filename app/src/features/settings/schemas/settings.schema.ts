import { z } from "zod";

const optionalUrl = z.string().url("URL invalida").or(z.literal(""));
const optionalEmail = z.string().email("E-mail invalido").or(z.literal(""));

export const settingsSchema = z.object({
  clinic_name: z.string().min(1, "O nome da clinica e obrigatorio"),
  professional_name: z.string().min(1, "O nome do profissional e obrigatorio"),
  clinic_email: optionalEmail,
  clinic_phone: z.string().max(40).optional().or(z.literal("")),
  clinic_address: z.string().max(500).optional().or(z.literal("")),
  expiration_alert_days: z.coerce.number().min(0, "Deve ser maior ou igual a zero"),
  auto_backup_enabled: z.boolean(),
  block_expired_items: z.boolean(),
  google_calendar_sync_enabled: z.boolean(),
  apps_script_url: optionalUrl,
  appscript_enabled: z.boolean(),
  appscript_api_url: optionalUrl,
  appscript_api_key: z.string().max(500).optional().or(z.literal("")),
  appscript_email_enabled: z.boolean(),
  appscript_calendar_enabled: z.boolean(),
  appscript_checkin_enabled: z.boolean(),
  appscript_checkin_delay_days: z.coerce.number().min(1).max(60),
  appscript_default_duration_minutes: z.coerce.number().min(5).max(480),
  appscript_calendar_id: z.string().max(300).optional().or(z.literal("")),
  appscript_last_health_check_at: z.string().optional().or(z.literal("")),
  appscript_last_health_check_status: z.string().optional().or(z.literal("")),
  lock_after_minutes: z.coerce.number().min(1, "Deve ser maior que zero").max(1440, "Maximo de 24 horas"),
  // Leitor de códigos (câmera)
  scanner_enabled: z.boolean(),
  scanner_mode: z.enum(["qr", "barcode", "any"]),
  scanner_preferred_camera_id: z.string().max(500).optional().or(z.literal("")),
});

export type SettingsFormInput = z.input<typeof settingsSchema>;
export type SettingsFormData = z.output<typeof settingsSchema>;
