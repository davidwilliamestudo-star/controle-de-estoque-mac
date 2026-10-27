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

  async sendPayload(
    payload: Record<string, any>,
    overrides?: { url?: string; apiKey?: string; enabled?: boolean }
  ): Promise<AppsScriptResponse> {
    const config = await this.getSettings();
    const isEnabled = overrides?.enabled ?? config.enabled;
    let targetUrl = (overrides?.url || config.url || "").trim();
    const targetApiKey = (overrides?.apiKey || config.apiKey || "").trim();

    if (!isEnabled) {
      throw new Error("Integração Apps Script está desativada nas configurações.");
    }
    if (!targetUrl || !targetApiKey) {
      throw new Error("URL ou API Key do Apps Script não configurada.");
    }

    // Normaliza URLs que foram coladas incorretamente com /edit no final
    if (targetUrl.endsWith("/edit")) {
      targetUrl = targetUrl.replace(/\/edit$/, "/exec");
    }

    const fullPayload = {
      ...payload,
      api_key: targetApiKey,
      clinic_id: "ana-morong-clinic",
    };

    try {
      const controller = new AbortController();
      // Timeout de 5min: o Google Apps Script pode levar até 6 minutos em operações complexas
      const timeoutId = setTimeout(() => controller.abort(), 300_000);

      const response = await fetch(targetUrl, {
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
        throw new Error(
          "Timeout: O Apps Script demorou mais de 5 minutos para responder. " +
          "A operação pode ter sido concluída no servidor — o sistema tentará novamente com segurança."
        );
      }
      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        throw new Error(
          `Falha de conexão com o Google Apps Script (Failed to fetch). ` +
          `Verifique se a implantação no Apps Script está com "Quem pode acessar: Qualquer pessoa" (Anyone), ` +
          `se a URL termina em "/exec" e se sua conexão está ativa. (URL testada: ${targetUrl})`
        );
      }
      throw error;
    }
  },

  async testConnection(overrides?: { url?: string; apiKey?: string }): Promise<AppsScriptResponse> {
    return this.sendPayload(
      {
        action: "health_check",
        request_id: crypto.randomUUID(),
      },
      overrides ? { ...overrides, enabled: true } : undefined
    );
  },

  async sendTestEmail(
    to: string,
    overrides?: { url?: string; apiKey?: string }
  ): Promise<AppsScriptResponse> {
    return this.sendPayload(
      {
        action: "send_test_email",
        request_id: crypto.randomUUID(),
        to,
      },
      overrides ? { ...overrides, enabled: true } : undefined
    );
  }
};
