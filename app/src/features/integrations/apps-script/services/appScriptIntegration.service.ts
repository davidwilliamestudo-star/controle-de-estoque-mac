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
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            `Acesso recusado pelo Google Apps Script (HTTP ${response.status}). ` +
            `Em "Implantar > Gerenciar implantações" no Apps Script, defina "Quem pode acessar: Qualquer pessoa" (ANYONE_ANONYMOUS) e confira se a URL /exec em Configurações > Integrações está ativa.`
          );
        }
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }

      const rawText = await response.text();
      let data: AppsScriptResponse;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        const monoMatch = rawText.match(/<div[^>]*font-family:\s*monospace[^>]*>([\s\S]*?)<\/div>/i);
        const plainException = monoMatch?.[1]
          ? monoMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
          : "";

        if (
          plainException.includes("You do not have permission") ||
          rawText.includes("You do not have permission") ||
          rawText.includes("Required permissions")
        ) {
          throw new Error(
            `O Google Apps Script precisa de autorização de acesso ao Google Drive/E-mail (${plainException || "Permissão pendente"}). ` +
            `Abra o editor do Apps Script, execute a função "autorizarPermissoesDoSistema" e publique uma Nova Versão da Implantação.`
          );
        }

        if (plainException) {
          throw new Error(`Erro retornado pelo Google Apps Script: ${plainException}`);
        }

        if (rawText.includes("<!DOCTYPE") || rawText.includes("<html") || rawText.includes("Google Accounts")) {
          throw new Error(
            "O Google Apps Script retornou uma página HTML em vez de JSON. " +
            "Verifique se a implantação web está configurada para acesso 'Qualquer pessoa' (Anyone) e sem bloqueio de login do Google."
          );
        }
        throw new Error(`Resposta inválida do Apps Script: ${rawText.slice(0, 150)}`);
      }

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
