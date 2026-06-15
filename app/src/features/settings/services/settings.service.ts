import { auditService } from "@/features/audit/services/audit.service";
import { settingsRepository } from "../repositories/settings.repository";
import type { SettingsFormData } from "../schemas/settings.schema";

function boolValue(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback;
  return value === "true";
}

function intValue(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const settingsService = {
  async getAll(): Promise<SettingsFormData> {
    const raw = await settingsRepository.getAll();
    const legacyUrl = raw.appscript_api_url || raw.apps_script_url || "";
    const integrationEnabled = boolValue(raw.appscript_enabled, boolValue(raw.google_calendar_sync_enabled));

    return {
      clinic_name: raw.clinic_name || "Dra. Ana Morong",
      professional_name: raw.professional_name || "Dra. Ana Morong",
      clinic_email: raw.clinic_email || "",
      clinic_phone: raw.clinic_phone || "",
      clinic_address: raw.clinic_address || "",
      expiration_alert_days: intValue(raw.expiration_alert_days, 30),
      auto_backup_enabled: boolValue(raw.auto_backup_enabled),
      block_expired_items: boolValue(raw.block_expired_items),
      google_calendar_sync_enabled: integrationEnabled,
      apps_script_url: legacyUrl,
      appscript_enabled: integrationEnabled,
      appscript_api_url: legacyUrl,
      appscript_api_key: raw.appscript_api_key || "",
      appscript_email_enabled: boolValue(raw.appscript_email_enabled, true),
      appscript_calendar_enabled: boolValue(raw.appscript_calendar_enabled, true),
      appscript_checkin_enabled: boolValue(raw.appscript_checkin_enabled, true),
      appscript_checkin_delay_days: intValue(raw.appscript_checkin_delay_days, 3),
      appscript_default_duration_minutes: intValue(raw.appscript_default_duration_minutes, 60),
      appscript_calendar_id: raw.appscript_calendar_id || "",
      appscript_last_health_check_at: raw.appscript_last_health_check_at || "",
      appscript_last_health_check_status: raw.appscript_last_health_check_status || "",
      lock_after_minutes: intValue(raw.lock_after_minutes, 30),
      // Leitor de códigos (câmera)
      scanner_enabled: boolValue(raw.scanner_enabled, true),
      scanner_mode: (raw.scanner_mode === "barcode" || raw.scanner_mode === "any"
        ? raw.scanner_mode
        : "qr") as "qr" | "barcode" | "any",
      scanner_preferred_camera_id: raw.scanner_preferred_camera_id || "",
    };
  },

  async saveMany(data: SettingsFormData): Promise<void> {
    const beforeData = await this.getAll();
    const stringified: Record<string, string> = {
      clinic_name: data.clinic_name,
      professional_name: data.professional_name,
      clinic_email: data.clinic_email || "",
      clinic_phone: data.clinic_phone || "",
      clinic_address: data.clinic_address || "",
      expiration_alert_days: String(data.expiration_alert_days),
      auto_backup_enabled: data.auto_backup_enabled ? "true" : "false",
      block_expired_items: data.block_expired_items ? "true" : "false",
      google_calendar_sync_enabled: data.appscript_enabled ? "true" : "false",
      apps_script_url: data.appscript_api_url || data.apps_script_url || "",
      appscript_enabled: data.appscript_enabled ? "true" : "false",
      appscript_api_url: data.appscript_api_url || data.apps_script_url || "",
      appscript_api_key: data.appscript_api_key || "",
      appscript_email_enabled: data.appscript_email_enabled ? "true" : "false",
      appscript_calendar_enabled: data.appscript_calendar_enabled ? "true" : "false",
      appscript_checkin_enabled: data.appscript_checkin_enabled ? "true" : "false",
      appscript_checkin_delay_days: String(data.appscript_checkin_delay_days),
      appscript_default_duration_minutes: String(data.appscript_default_duration_minutes),
      appscript_calendar_id: data.appscript_calendar_id || "",
      appscript_last_health_check_at: data.appscript_last_health_check_at || "",
      appscript_last_health_check_status: data.appscript_last_health_check_status || "",
      lock_after_minutes: String(data.lock_after_minutes),
      // Leitor de códigos (câmera)
      scanner_enabled: data.scanner_enabled ? "true" : "false",
      scanner_mode: data.scanner_mode || "qr",
      scanner_preferred_camera_id: data.scanner_preferred_camera_id || "",
    };

    await settingsRepository.saveMany(stringified);

    await auditService.log({
      action: "settings_updated",
      entity_type: "settings",
      description: "Configuracoes do sistema foram atualizadas.",
      before_data: { ...beforeData, appscript_api_key: beforeData.appscript_api_key ? "***" : "" },
      after_data: { ...data, appscript_api_key: data.appscript_api_key ? "***" : "" },
    });
  },
};
