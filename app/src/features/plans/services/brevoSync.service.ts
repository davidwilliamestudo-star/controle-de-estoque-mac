/**
 * brevoSync.service.ts
 * Integracao com o Brevo (antigo Sendinblue) como CRM e motor de e-mails transacionais
 * para o ciclo de vida dos planos Saude 360.
 *
 * Funciona de forma assincrona e nao-bloqueante: falhas na rede ou chave nao configurada
 * nunca travam as operacoes clinicas locais.
 */

import { dbSelect, dbExecute } from "@/lib/db/sqlite";
import type { PatientPlan } from "../repositories/patientPlans.repository";

export interface BrevoSyncConfig {
  apiKey?: string;
  senderEmail?: string;
  senderName?: string;
  defaultListId?: number;
}

export interface SyncContactPayload {
  email: string;
  fullName: string;
  phone?: string | null;
  planName?: string | null;
  planStatus?: string | null;
  planEndDate?: string | null;
  daysRemaining?: number | null;
}

export interface BrevoAccountInfo {
  email: string;
  firstName: string;
  companyName: string;
  planType: string;
}

class BrevoSyncService {
  private static STORAGE_KEY = "brevo_api_config";

  getConfig(): BrevoSyncConfig {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(BrevoSyncService.STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.warn("[BrevoSync] Erro ao ler config do localStorage:", e);
      }
    }
    return {
      senderName: "Dra. Ana Carla Morong",
      senderEmail: "contato@draanamorong.com.br",
    };
  }

  saveConfig(config: BrevoSyncConfig): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(BrevoSyncService.STORAGE_KEY, JSON.stringify(config));
    }
  }

  /**
   * Testa a conectividade e chave do Brevo
   */
  async testConnection(apiKey?: string): Promise<{ success: boolean; account?: BrevoAccountInfo; error?: string }> {
    const key = apiKey || this.getConfig().apiKey;
    if (!key) {
      return { success: false, error: "Chave de API do Brevo não informada." };
    }

    try {
      const res = await fetch("https://api.brevo.com/v3/account", {
        method: "GET",
        headers: {
          "api-key": key,
          "accept": "application/json",
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        return {
          success: false,
          error: errJson?.message || `Erro ${res.status}: Credencial inválida no Brevo.`,
        };
      }

      const data = await res.json();
      return {
        success: true,
        account: {
          email: data.email,
          firstName: data.firstName || "Clínica",
          companyName: data.companyName || "Dra. Ana Carla Morong",
          planType: data.plan?.[0]?.type || "Gratuito",
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Falha na requisição: ${err.message || String(err)}`,
      };
    }
  }

  /**
   * Sincroniza um contato e atributos de plano no CRM Brevo
   */
  async syncContact(payload: SyncContactPayload): Promise<{ success: boolean; contactId?: string; error?: string }> {
    const config = this.getConfig();
    if (!config.apiKey) {
      // Brevo não configurado: silencioso
      return { success: false, error: "Brevo não configurado" };
    }

    if (!payload.email || !payload.email.includes("@")) {
      return { success: false, error: "Paciente sem e-mail válido" };
    }

    try {
      // Normalização de telefone para formato internacional E.164 (+55...)
      let smsPhone: string | undefined = undefined;
      if (payload.phone) {
        const digits = payload.phone.replace(/\D/g, "");
        if (digits.length >= 10) {
          smsPhone = digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
        }
      }

      const bodyData = {
        email: payload.email.trim().toLowerCase(),
        attributes: {
          NOME: payload.fullName,
          SMS: smsPhone,
          PLANO_SAUDE360: payload.planName || "Sem Plano Ativo",
          STATUS_PLANO: payload.planStatus || "proposta",
          TERMINO_PLANO: payload.planEndDate || "",
          DIAS_RESTANTES: payload.daysRemaining ?? 0,
        },
        updateEnabled: true,
      };

      const res = await fetch("https://api.brevo.com/v3/contacts", {
        method: "POST",
        headers: {
          "api-key": config.apiKey,
          "content-type": "application/json",
          "accept": "application/json",
        },
        body: JSON.stringify(bodyData),
      });

      if (!res.ok && res.status !== 204 && res.status !== 201) {
        // Se já existe e retornou duplicado, tenta atualizar via PUT
        if (res.status === 400) {
          const putRes = await fetch(
            `https://api.brevo.com/v3/contacts/${encodeURIComponent(payload.email.trim().toLowerCase())}`,
            {
              method: "PUT",
              headers: {
                "api-key": config.apiKey,
                "content-type": "application/json",
                "accept": "application/json",
              },
              body: JSON.stringify({ attributes: bodyData.attributes }),
            }
          );
          if (putRes.ok || putRes.status === 204) {
            return { success: true };
          }
        }
        const errJson = await res.json().catch(() => null);
        return { success: false, error: errJson?.message || `Erro Brevo ${res.status}` };
      }

      const resData = await res.json().catch(() => ({}));
      return { success: true, contactId: resData?.id ? String(resData.id) : undefined };
    } catch (err: any) {
      console.warn("[BrevoSync] Falha ao sincronizar contato:", err);
      // Enfileira na fila local de sincronização offline
      await this.queueOfflineSync("sync_contact", payload);
      return { success: false, error: err.message };
    }
  }

  /**
   * Envia e-mail transacional de notificação do plano
   */
  async sendTransactionalEmail(options: {
    toEmail: string;
    toName: string;
    subject: string;
    htmlContent: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const config = this.getConfig();
    if (!config.apiKey) return { success: false, error: "Brevo não configurado" };

    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": config.apiKey,
          "content-type": "application/json",
          "accept": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: config.senderName || "Dra. Ana Carla Morong",
            email: config.senderEmail || "contato@draanamorong.com.br",
          },
          to: [{ email: options.toEmail, name: options.toName }],
          subject: options.subject,
          htmlContent: options.htmlContent,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        return { success: false, error: errJson?.message || `Erro SMTP Brevo ${res.status}` };
      }

      const resData = await res.json();
      return { success: true, messageId: resData.messageId };
    } catch (err: any) {
      console.warn("[BrevoSync] Falha ao enviar e-mail transacional:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Enfileira ação para sincronização futura em caso de offline
   */
  private async queueOfflineSync(action: string, payload: any): Promise<void> {
    try {
      const id = crypto.randomUUID();
      const requestId = `${action}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await dbExecute(
        `INSERT INTO external_sync_queue (
          id, clinic_id, provider, action, request_id, payload_json, status, created_at, updated_at
        ) VALUES (?, 'ana-morong-clinic', 'brevo', ?, ?, ?, 'pending', datetime('now'), datetime('now'))`,
        [id, action, requestId, JSON.stringify(payload)]
      );
    } catch (e) {
      console.warn("[BrevoSync] Não foi possível enfileirar sincronização offline:", e);
    }
  }
}

export const brevoSyncService = new BrevoSyncService();

