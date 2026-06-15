/**
 * appScriptIntegration.service.ts
 * Responsável estritamente pela comunicação HTTP com o Apps Script.
 * Pega a URL e a Key do `settings.repository.ts`.
 */

import { settingsRepository } from "@/features/settings/repositories/settings.repository";

interface AppsScriptResponse {
  ok: boolean;
  request_id: string;
  action: string;
  timestamp: string;
  calendar?: {
    event_id: string;
    event_url: string;
    add_to_calendar_url: string;
    created: boolean;
    start: string;
    end: string;
  };
  email?: {
    sent: boolean;
    to: string;
    sent_at: string;
  };
  checkin?: {
    scheduled: boolean;
    checkin_request_id: string;
    scheduled_for: string;
    form_url: string;
  };
  error?: string;
  message?: string;
  error_code?: string;
  [key: string]: any;
}

export const appScriptIntegrationService = {
  async getSettings() {
    const settings = await settingsRepository.getAll();
    return {
      enabled: settings.appscript_enabled === "true",
      url: settings.appscript_api_url || "",
      apiKey: settings.appscript_api_key || "",
      emailEnabled: settings.appscript_email_enabled === "true",
      calendarEnabled: settings.appscript_calendar_enabled === "true",
      checkinEnabled: settings.appscript_checkin_enabled === "true",
    };
  },

  async sendPayload(payload: Record<string, any>): Promise<AppsScriptResponse> {
    const config = await this.getSettings();
    if (!config.enabled) {
      throw new Error("Integração Apps Script está desativada nas configurações.");
    }
    if (!config.url || !config.apiKey) {
      throw new Error("URL ou API Key do Apps Script não configurada.");
    }

    const fullPayload = {
      ...payload,
      api_key: config.apiKey,
      clinic_id: "ana-morong-clinic",
    };

    try {
      const controller = new AbortController();
      // --- CORREÇÃO 3: Timeout de 5min (antes: 30s) ---
      // O Google Apps Script pode levar até 6 minutos em operações complexas
      // (criar evento no Calendar + enviar e-mail + agendar checkin simultaneamente).
      // Com 30s, o frontend cancelava e re-enfileirava a tarefa enquanto o servidor
      // já a havia executado — causando duplicação de eventos e e-mails.
      const timeoutId = setTimeout(() => controller.abort(), 300_000); // 5min timeout

      const response = await fetch(config.url, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain", // Usa text/plain para evitar CORS preflight (OPTIONS)
        },
        body: JSON.stringify(fullPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }

      const data: AppsScriptResponse = await response.json();
      if (!data.ok) {
         throw new Error(data.message || data.error || data.error_code || "A API do Apps Script retornou um erro.");
      }

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // IMPORTANTE: Um AbortError de timeout é AMBÍGUO — o Apps Script pode ter
        // terminado a operação com sucesso antes da conexão cair. O status 'failed'
        // na fila local permite reprocessamento seguro pois a idempotência do backend
        // (LockService + request_id) garante que não haverá duplicação.
        throw new Error(
          "Timeout: O Apps Script demorou mais de 5 minutos para responder. " +
          "A operação pode ter sido concluída no servidor — o sistema tentará novamente com segurança."
        );
      }
      throw error;
    }

  },

  async testConnection(): Promise<AppsScriptResponse> {
    return this.sendPayload({
      action: "health_check",
      request_id: crypto.randomUUID(),
    });
  },

  async sendTestEmail(to: string): Promise<AppsScriptResponse> {
    return this.sendPayload({
      action: "send_test_email",
      request_id: crypto.randomUUID(),
      to,
    });
  }
};
