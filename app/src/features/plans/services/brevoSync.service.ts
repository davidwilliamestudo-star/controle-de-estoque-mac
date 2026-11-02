/**
 * brevoSync.service.ts
 * Integração robusta com o Brevo (antigo Sendinblue) como CRM e motor de e-mails transacionais
 * para a Jornada de Planos Saúde 360® da Clínica Dra. Ana Carla Morong.
 *
 * Suporta:
 * 1. Upsert de Contatos e Atributos Customizados (Nome, SMS, Plano, Status, Término, Dias Restantes)
 * 2. Setup Automático de Atributos no Brevo (One-click)
 * 3. Criação e atualização de Negócios (Deals no CRM Brevo)
 * 4. E-mails Transacionais Timbrados Oficiais (Proposta/Assinatura, Boas-vindas/Ativação, Renovação)
 * 5. Sincronização em Massa de Pacientes
 * 6. Operação Offline e Fallback Não-Bloqueante via external_sync_queue
 */

import { dbSelect, dbExecute } from "@/lib/db/sqlite";
import type { PatientPlan } from "../repositories/patientPlans.repository";

export interface BrevoSyncConfig {
  apiKey?: string;
  senderEmail?: string;
  senderName?: string;
  defaultListId?: number;
  sendProposalEmailAuto?: boolean;
  sendActivationEmailAuto?: boolean;
  sendRenewalEmailAuto?: boolean;
}

export interface SyncContactPayload {
  email: string;
  fullName: string;
  phone?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  planName?: string | null;
  planKey?: string | null;
  planStatus?: string | null;
  planStartDate?: string | null;
  planEndDate?: string | null;
  daysRemaining?: number | null;
  includedSessions?: number | null;
  sessionsUsed?: number | null;
  totalValue?: number | null;
}

export interface BrevoAccountInfo {
  email: string;
  firstName: string;
  companyName: string;
  planType: string;
  credits?: number;
}

class BrevoSyncService {
  private static STORAGE_KEY = "brevo_api_config";

  getConfig(): BrevoSyncConfig {
    const defaultApiKey = "";
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(BrevoSyncService.STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            ...parsed,
            apiKey: parsed.apiKey || defaultApiKey,
          };
        }
      } catch (e) {
        console.warn("[BrevoSync] Erro ao ler config do localStorage:", e);
      }
    }
    return {
      apiKey: defaultApiKey,
      senderName: "Dra. Ana Carla Morong",
      senderEmail: "contato@draanamorong.com.br",
      sendProposalEmailAuto: false,
      sendActivationEmailAuto: true,
      sendRenewalEmailAuto: false,
    };
  }

  async saveConfig(config: BrevoSyncConfig): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.setItem(BrevoSyncService.STORAGE_KEY, JSON.stringify(config));
    }
    try {
      const keys: Array<[string, string | null]> = [
        ["brevo_api_key", config.apiKey || null],
        ["brevo_sender_email", config.senderEmail || null],
        ["brevo_sender_name", config.senderName || null],
        ["brevo_auto_proposal_email", config.sendProposalEmailAuto ? "1" : "0"],
        ["brevo_auto_activation_email", config.sendActivationEmailAuto ? "1" : "0"],
        ["brevo_auto_renewal_email", config.sendRenewalEmailAuto ? "1" : "0"],
      ];
      for (const [k, v] of keys) {
        if (v !== null) {
          await dbExecute(
            `INSERT INTO settings (clinic_id, key, value, updated_at)
             VALUES ('ana-morong-clinic', ?, ?, datetime('now'))
             ON CONFLICT(clinic_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
            [k, v]
          );
        }
      }
    } catch (err) {
      console.warn("[BrevoSync] Não foi possível salvar settings no banco:", err);
    }
  }

  /**
   * Testa a conectividade com o Brevo e retorna dados da conta e créditos
   */
  async testConnection(apiKey?: string): Promise<{ success: boolean; account?: BrevoAccountInfo; error?: string }> {
    const key = apiKey || this.getConfig().apiKey;

    // Tenta primeiro via endpoint Cloudflare Worker /api/brevo/test
    try {
      const headers: Record<string, string> = { accept: "application/json" };
      if (key) headers["api-key"] = key;

      const proxyRes = await fetch("/api/brevo/test", {
        method: "GET",
        headers,
      });

      if (proxyRes.ok) {
        const json: any = await proxyRes.json();
        if (json.success && json.account) {
          return { success: true, account: json.account };
        }
      } else {
        const errJson: any = await proxyRes.json().catch(() => null);
        return {
          success: false,
          error: errJson?.error || `Erro HTTP ${proxyRes.status} no proxy do Brevo`,
        };
      }
    } catch {
      // Se em navegador web, não tenta direto no browser pois o Brevo bloqueia IP de cliente com 401
      if (typeof window !== "undefined" && window.location.protocol.startsWith("http")) {
        return { success: false, error: "Não foi possível conectar ao servidor Brevo." };
      }
    }

    if (!key) {
      return { success: false, error: "Chave de API do Brevo não configurada." };
    }

    try {
      const res = await fetch("https://api.brevo.com/v3/account", {
        method: "GET",
        headers: {
          "api-key": key,
          accept: "application/json",
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        return {
          success: false,
          error: errJson?.message || `Erro HTTP ${res.status}: Chave do Brevo inválida.`,
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
          credits: data.plan?.[0]?.credits,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Falha na requisição de teste: ${err.message || String(err)}`,
      };
    }
  }

  /**
   * Cria os atributos personalizados no Brevo com 1 clique (para que as listas fiquem perfeitas)
   */
  async setupCustomAttributes(apiKey?: string): Promise<{ success: boolean; created: string[]; errors: string[] }> {
    const key = apiKey || this.getConfig().apiKey;

    // Tenta primeiro via Cloudflare Worker
    try {
      const proxyRes = await fetch("/api/brevo/setup-attributes", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(key ? { "api-key": key } : {}),
        },
        body: JSON.stringify({ apiKey: key }),
      });
      if (proxyRes.ok) {
        const proxyData: any = await proxyRes.json();
        if (proxyData.created) {
          return {
            success: proxyData.success ?? true,
            created: proxyData.created,
            errors: proxyData.errors || [],
          };
        }
      }
    } catch {
      // Prossegue direto
    }

    if (!key) throw new Error("Chave de API não informada.");

    const attributesToCreate: Array<{ name: string; type: "text" | "date" | "float" }> = [
      { name: "PLANO_SAUDE360", type: "text" },
      { name: "STATUS_PLANO", type: "text" },
      { name: "TERMINO_PLANO", type: "text" },
      { name: "DIAS_RESTANTES", type: "float" },
      { name: "SESSOES_USADAS", type: "float" },
      { name: "SESSOES_TOTAL", type: "float" },
      { name: "SESSOES_RESTANTES", type: "float" },
      { name: "VALOR_PLANO", type: "float" },
      { name: "DATA_INICIO", type: "text" },
      { name: "DATA_NASCIMENTO", type: "date" },
      { name: "GENERO", type: "text" },
      { name: "ULTIMA_VISITA", type: "date" },
    ];

    const created: string[] = [];
    const errors: string[] = [];

    for (const attr of attributesToCreate) {
      try {
        const res = await fetch(`https://api.brevo.com/v3/contacts/attributes/normal/${attr.name}`, {
          method: "POST",
          headers: {
            "api-key": key,
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({ type: attr.type }),
        });

        if (res.ok || res.status === 201 || res.status === 204) {
          created.push(attr.name);
        } else {
          const errData = await res.json().catch(() => null);
          const msg = errData?.message || `Erro ${res.status}`;
          // Se já existe, considera OK
          if (msg.includes("already exist") || msg.includes("déjà") || res.status === 400) {
            created.push(`${attr.name} (já existia)`);
          } else {
            errors.push(`${attr.name}: ${msg}`);
          }
        }
      } catch (err: any) {
        errors.push(`${attr.name}: ${err.message}`);
      }
    }

    return {
      success: errors.length === 0,
      created,
      errors,
    };
  }

  /**
   * Instala automaticamente todos os templates oficiais de datas comemorativas e automações no Brevo
   */
  async setupOfficialTemplates(apiKey?: string): Promise<{
    success: boolean;
    totalTemplates: number;
    created: string[];
    updated: string[];
    errors: string[];
  }> {
    const key = apiKey || this.getConfig().apiKey;
    try {
      const proxyRes = await fetch("/api/brevo/setup-templates", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(key ? { "api-key": key } : {}),
        },
        body: JSON.stringify({ apiKey: key }),
      });
      if (proxyRes.ok) {
        return await proxyRes.json();
      }
      const errJson: any = await proxyRes.json().catch(() => null);
      return {
        success: false,
        totalTemplates: 0,
        created: [],
        updated: [],
        errors: [errJson?.error || `Erro HTTP ${proxyRes.status}`],
      };
    } catch (err: any) {
      return {
        success: false,
        totalTemplates: 0,
        created: [],
        updated: [],
        errors: [err.message || String(err)],
      };
    }
  }

  /**
   * Sincroniza um contato e atributos de plano no CRM Brevo
   */
  async syncContact(payload: SyncContactPayload): Promise<{ success: boolean; contactId?: string; error?: string }> {
    const config = this.getConfig();

    if (!payload.email || typeof payload.email !== "string" || !payload.email.includes("@")) {
      return { success: false, error: "Paciente sem e-mail válido" };
    }

    const sanitizedPayload = {
      ...payload,
      planStartDate: payload.planStartDate && String(payload.planStartDate).trim() ? String(payload.planStartDate).slice(0, 10) : undefined,
      planEndDate: payload.planEndDate && String(payload.planEndDate).trim() ? String(payload.planEndDate).slice(0, 10) : undefined,
      daysRemaining: Math.max(0, Math.round(Number(payload.daysRemaining ?? 0))) || 0,
      sessionsUsed: Math.max(0, Math.round(Number(payload.sessionsUsed ?? 0))) || 0,
      includedSessions: Math.max(0, Math.round(Number(payload.includedSessions ?? 0))) || 0,
      totalValue: Number(payload.totalValue ?? 0) || 0,
    };

    // Tenta primeiro via Cloudflare Worker
    try {
      const proxyRes = await fetch("/api/brevo/sync-contact", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(config.apiKey ? { "api-key": config.apiKey } : {}),
        },
        body: JSON.stringify({ ...sanitizedPayload, defaultListId: config.defaultListId }),
      });
      if (proxyRes.ok) {
        const json: any = await proxyRes.json();
        if (json.success) {
          return { success: true, contactId: json.contactId };
        }
      } else {
        const errJson: any = await proxyRes.json().catch(() => null);
        const errorMsg = errJson?.error || `Erro HTTP ${proxyRes.status} no proxy do Brevo`;
        console.warn("[BrevoSync] Proxy retornou erro ao sincronizar contato:", errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch {
      // Se em navegador web, NÃO tentar chamada direta a https://api.brevo.com/v3/contacts,
      // pois o Brevo bloqueia IP de cliente com 401 Unauthorized
      if (typeof window !== "undefined" && window.location.protocol.startsWith("http")) {
        return { success: false, error: "Falha de rede ao sincronizar com o Brevo." };
      }
    }

    if (!config.apiKey) {
      return { success: false, error: "Brevo não configurado" };
    }

    try {
      let smsPhone: string | undefined = undefined;
      if (payload.phone) {
        let digits = String(payload.phone).replace(/\D/g, "");
        if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
          digits = digits.slice(2);
        }
        if (digits.length === 10 && ["6", "7", "8", "9"].includes(digits[2])) {
          digits = digits.slice(0, 2) + "9" + digits.slice(2);
        }
        if (digits.length === 11) {
          smsPhone = `+55${digits}`;
        }
      }

      // Separa Primeiro Nome e Sobrenome
      const nameParts = (payload.fullName || "").trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const sessionsRemaining = Math.max(0, (sanitizedPayload.includedSessions || 0) - (sanitizedPayload.sessionsUsed || 0));
      const attributes: Record<string, any> = {
        PLANO_SAUDE360: payload.planName || "Sem Plano Ativo",
        STATUS_PLANO: payload.planStatus || "Sem Plano",
        DIAS_RESTANTES: sanitizedPayload.daysRemaining,
        SESSOES_USADAS: sanitizedPayload.sessionsUsed,
        SESSOES_TOTAL: sanitizedPayload.includedSessions,
        SESSOES_RESTANTES: sessionsRemaining,
        VALOR_PLANO: sanitizedPayload.totalValue,
      };

      if (firstName) attributes.NOME = firstName;
      if (lastName) attributes.SOBRENOME = lastName;
      if (smsPhone) attributes.SMS = smsPhone;
      if (sanitizedPayload.planStartDate) attributes.DATA_INICIO = sanitizedPayload.planStartDate;
      if (sanitizedPayload.planEndDate) attributes.TERMINO_PLANO = sanitizedPayload.planEndDate;
      if (payload.birthDate && String(payload.birthDate).trim()) {
        attributes.DATA_NASCIMENTO = String(payload.birthDate).slice(0, 10);
      }
      if (payload.gender && String(payload.gender).trim()) {
        attributes.GENERO = String(payload.gender).trim();
      }

      const bodyData: any = {
        email: payload.email.trim().toLowerCase(),
        attributes,
        updateEnabled: true,
      };

      if (config.defaultListId) {
        bodyData.listIds = [config.defaultListId];
      }

      const res = await fetch("https://api.brevo.com/v3/contacts", {
        method: "POST",
        headers: {
          "api-key": config.apiKey,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(bodyData),
      });

      if (!res.ok && res.status !== 204 && res.status !== 201) {
        // Se já existe e retornou duplicado, atualiza atributos via PUT
        if (res.status === 400) {
          const putRes = await fetch(
            `https://api.brevo.com/v3/contacts/${encodeURIComponent(payload.email.trim().toLowerCase())}`,
            {
              method: "PUT",
              headers: {
                "api-key": config.apiKey,
                "content-type": "application/json",
                accept: "application/json",
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
      await this.queueOfflineSync("sync_contact", payload);
      return { success: false, error: err.message };
    }
  }

  /**
   * Dispara e-mail transacional timbrado da Dra. Ana Carla Morong
   */
  async sendTransactionalEmail(options: {
    toEmail: string;
    toName: string;
    subject: string;
    htmlContent: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const config = this.getConfig();

    // Tenta primeiro via Cloudflare Worker
    try {
      const proxyRes = await fetch("/api/brevo/send-email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(config.apiKey ? { "api-key": config.apiKey } : {}),
        },
        body: JSON.stringify({
          ...options,
          senderName: config.senderName,
          senderEmail: config.senderEmail,
        }),
      });
      if (proxyRes.ok) {
        const json: any = await proxyRes.json();
        if (json.success) {
          return { success: true, messageId: json.messageId };
        }
      } else {
        const errJson: any = await proxyRes.json().catch(() => null);
        const errorMsg = errJson?.error || `Erro HTTP ${proxyRes.status} no proxy de e-mail`;
        console.warn("[BrevoSync] Proxy retornou erro no disparo de e-mail:", errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch {
      // Se em navegador web, NÃO tentar chamada direta para api.brevo.com
      if (typeof window !== "undefined" && window.location.protocol.startsWith("http")) {
        return { success: false, error: "Falha de conexão com o servidor de e-mail." };
      }
    }

    if (!config.apiKey) return { success: false, error: "Brevo não configurado" };

    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": config.apiKey,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: config.senderName || "Dra. Ana Carla Morong",
            email: config.senderEmail || "contato@draanamorong.com.br",
          },
          to: [{ email: options.toEmail.trim(), name: options.toName.trim() }],
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

  // ──────────────────────────────────────────────────────────────────────────
  // MODELOS OFICIAIS DE E-MAIL TIMBRADOS (HTML RESPONSIVO)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * E-mail 1: Proposta Oficial e Link para Assinatura Eletrônica
   */
  async sendProposalEmail(params: {
    toEmail: string;
    toName: string;
    planName: string;
    durationMonths: number;
    totalValue: number;
    signUrl: string;
  }): Promise<{ success: boolean; error?: string }> {
    const htmlContent = wrapInOfficialTemplate(`
      <h2 style="color: #064E3B; font-size: 18px; font-weight: 800; margin: 0 0 16px;">
        Sua Jornada de Saúde Começa Aqui
      </h2>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
        Olá, <strong>${escapeHtml(params.toName)}</strong>!
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px;">
        Foi um prazer realizar a sua avaliação. Com base em suas necessidades clínicas e objetivos de longevidade saudável, preparamos o seu contrato para o programa <strong>${escapeHtml(params.planName)}</strong> (${params.durationMonths} meses).
      </p>

      <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #166534; font-weight: 600;">Programa Selecionado:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 800; color: #064E3B;">${escapeHtml(params.planName)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #166534; font-weight: 600;">Duração da Jornada:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #064E3B;">${params.durationMonths} meses corridos</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #166534; font-weight: 600;">Investimento Total:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 800; color: #064E3B;">R$ ${params.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 24px;">
        Para formalizar a sua adesão e garantir a sua vaga na agenda, acesse o link seguro abaixo para realizar a assinatura digital em poucos segundos:
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${params.signUrl}" style="background-color: #064E3B; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 14px; font-weight: 700; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(6, 78, 59, 0.2);">
          Revisar e Assinar Contrato Eletrônico
        </a>
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 24px 0 0; text-align: center;">
        Dúvidas? Entre em contato diretamente com nossa recepção pelo WhatsApp (48) 98857-2882.
      </p>
    `);

    return this.sendTransactionalEmail({
      toEmail: params.toEmail,
      toName: params.toName,
      subject: `Sua Proposta ${params.planName} — Dra. Ana Carla Morong`,
      htmlContent,
    });
  }

  /**
   * E-mail 2: Boas-vindas & Início Oficial da Vigência (Após Pagamento Confirmado)
   */
  async sendActivationEmail(params: {
    toEmail: string;
    toName: string;
    planName: string;
    durationMonths: number;
    startDate: string;
    endDate: string;
    includedProcedures: number;
  }): Promise<{ success: boolean; error?: string }> {
    const htmlContent = wrapInOfficialTemplate(`
      <h2 style="color: #064E3B; font-size: 18px; font-weight: 800; margin: 0 0 16px;">
        Boas-vindas à sua Jornada Saúde 360®!
      </h2>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
        Olá, <strong>${escapeHtml(params.toName)}</strong>!
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px;">
        É com imensa alegria que confirmamos a ativação oficial do seu acompanhamento médico <strong>${escapeHtml(params.planName)}</strong>. A partir de hoje, você conta com o suporte integral da nossa equipe médica e de enfermagem.
      </p>

      <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
        <h4 style="margin: 0 0 12px; color: #064E3B; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
          Resumo do Seu Plano Ativo
        </h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 6px 0; color: #166534; font-weight: 600;">Data de Início:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #064E3B;">${formatDateBR(params.startDate)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #166534; font-weight: 600;">Vigência até:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 800; color: #064E3B;">${formatDateBR(params.endDate)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #166534; font-weight: 600;">Aplicações Inclusas:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #064E3B;">${params.includedProcedures} sessões contratadas</td>
          </tr>
        </table>
      </div>

      <h4 style="color: #064E3B; font-size: 14px; font-weight: 700; margin: 24px 0 8px;">
        Próximos Passos:
      </h4>
      <ul style="font-size: 13.5px; line-height: 1.6; color: #334155; padding-left: 20px; margin: 0 0 24px;">
        <li>Nossa equipe entrará em contato para confirmar as datas das suas primeiras sessões e consultas de acompanhamento.</li>
        <li>Em caso de dúvidas sobre receitas ou orientações terapêuticas, você tem canal direto com a nossa recepção via WhatsApp.</li>
      </ul>

      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 8px;">
        Estamos dedicados à sua transformação e longevidade saudável!
      </p>
      <p style="font-size: 14px; font-weight: 700; color: #064E3B; margin: 0;">
        Dra. Ana Carla Morong & Equipe
      </p>
    `);

    return this.sendTransactionalEmail({
      toEmail: params.toEmail,
      toName: params.toName,
      subject: `Plano Ativado: Bem-vinda à sua Jornada Saúde 360® — Dra. Ana Carla Morong`,
      htmlContent,
    });
  }

  /**
   * E-mail 3: Aviso de Renovação Antecipada (14 dias para o fim do ciclo)
   */
  async sendRenewalNoticeEmail(params: {
    toEmail: string;
    toName: string;
    planName: string;
    endDate: string;
    daysRemaining: number;
  }): Promise<{ success: boolean; error?: string }> {
    const htmlContent = wrapInOfficialTemplate(`
      <h2 style="color: #064E3B; font-size: 18px; font-weight: 800; margin: 0 0 16px;">
        Seu Ciclo de Tratamento está na Reta Final
      </h2>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
        Olá, <strong>${escapeHtml(params.toName)}</strong>!
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px;">
        O seu programa <strong>${escapeHtml(params.planName)}</strong> está se aproximando do término (restam <strong>${params.daysRemaining} dias</strong> até ${formatDateBR(params.endDate)}).
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px;">
        A consolidação dos resultados e a manutenção do seu equilíbrio metabólico são essenciais para preservar todas as conquistas alcançadas até aqui.
      </p>

      <div style="background-color: #FEF3C7; border: 1px solid #FCD34D; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
        <h4 style="margin: 0 0 8px; color: #92400E; font-size: 14px; font-weight: 800;">
          Programa de Manutenção Saúde 360®
        </h4>
        <p style="margin: 0; font-size: 13px; color: #78350F; line-height: 1.5;">
          Garante a sustentação de longo prazo, bioimpedâncias periódicas e acompanhamento médico contínuo com condições exclusivas de renovação para pacientes ativas.
        </p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://wa.me/5548988572882?text=${encodeURIComponent(`Olá! Gostaria de conversar sobre a renovação do meu plano de acompanhamento com a Dra. Ana.`)}" style="background-color: #064E3B; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 14px; font-weight: 700; border-radius: 12px; display: inline-block;">
          Agendar Consulta de Transição & Renovação
        </a>
      </div>
    `);

    return this.sendTransactionalEmail({
      toEmail: params.toEmail,
      toName: params.toName,
      subject: `Seu Acompanhamento Saúde 360®: Planejando a Próxima Etapa — Dra. Ana Carla Morong`,
      htmlContent,
    });
  }

  /**
   * E-mail 4: Follow-up Comercial / Retorno da Dra. Ana Carla Morong
   */
  async sendFollowupEmail(params: {
    toEmail: string;
    toName: string;
    planName: string;
    customNote?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const htmlContent = wrapInOfficialTemplate(`
      <h2 style="color: #064E3B; font-size: 18px; font-weight: 800; margin: 0 0 16px;">
        Acompanhamento do seu Plano de Saúde & Longevidade
      </h2>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
        Olá, <strong>${escapeHtml(params.toName)}</strong>!
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
        Esperamos que você esteja muito bem. Passando para dar continuidade à nossa conversa sobre o programa <strong>${escapeHtml(params.planName)}</strong>.
      </p>

      ${params.customNote ? `
      <div style="background-color: #F8FAFC; border-left: 4px solid #064E3B; padding: 16px 20px; border-radius: 8px; margin: 0 0 20px;">
        <p style="margin: 0; font-size: 13.5px; color: #334155; font-style: italic; line-height: 1.6;">
          "${escapeHtml(params.customNote)}"
        </p>
      </div>
      ` : ""}

      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 24px;">
        Nosso compromisso é estruturar o melhor momento e condições para o início do seu tratamento com toda a atenção médica necessária.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://wa.me/5548988572882?text=${encodeURIComponent(`Olá! Gostaria de tirar dúvidas sobre a proposta do plano ${params.planName}.`)}" style="background-color: #064E3B; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 14px; font-weight: 700; border-radius: 12px; display: inline-block;">
          Falar com a Recepção no WhatsApp
        </a>
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 24px 0 0; text-align: center;">
        Clínica Médica Dra. Ana Carla Morong • Florianópolis - SC
      </p>
    `);

    return this.sendTransactionalEmail({
      toEmail: params.toEmail,
      toName: params.toName,
      subject: `Retorno do seu Plano ${params.planName} — Dra. Ana Carla Morong`,
      htmlContent,
    });
  }

  /**
   * Sincroniza em massa todos os pacientes com a conta do Brevo
   */
  async syncAllPatients(onProgress?: (current: number, total: number) => void): Promise<{
    total: number;
    synced: number;
    failed: number;
  }> {
    const rows = await dbSelect<any>(`
      SELECT p.id, p.full_name, p.email, p.phone, p.birth_date,
             pp.plan_name, pp.plan_key, pp.status as plan_status,
             pp.start_date, pp.end_date, pp.included_procedures_total, pp.total_value
      FROM patients p
      LEFT JOIN patient_plans pp ON pp.patient_id = p.id AND pp.status = 'active'
      WHERE p.deleted_at IS NULL AND p.email IS NOT NULL AND p.email LIKE '%@%'
    `);

    let synced = 0;
    let failed = 0;
    const total = rows.length;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (onProgress) onProgress(i + 1, total);

      let daysRemaining: number | null = null;
      if (r.end_date) {
        const diff = Math.round((new Date(r.end_date).getTime() - Date.now()) / 86400000);
        daysRemaining = Math.max(0, diff);
      }

      const res = await this.syncContact({
        email: r.email,
        fullName: r.full_name,
        phone: r.phone,
        birthDate: r.birth_date,
        planName: r.plan_name,
        planKey: r.plan_key,
        planStatus: r.plan_status ? translatePlanStatus(r.plan_status) : "Sem Plano",
        planStartDate: r.start_date,
        planEndDate: r.end_date,
        daysRemaining,
        includedSessions: r.included_procedures_total,
        totalValue: r.total_value,
      });

      if (res.success) synced++;
      else failed++;
    }

    return { total, synced, failed };
  }

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
      console.warn("[BrevoSync] Falha ao gravar fila offline:", e);
    }
  }
}

export const brevoSyncService = new BrevoSyncService();

// ──────────────────────────────────────────────────────────────────────────
// AUXILIARES DE FORMATAÇÃO E TIMBRADO
// ──────────────────────────────────────────────────────────────────────────

function wrapInOfficialTemplate(bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dra. Ana Carla Morong</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
    <!-- Timbrado Cabeçalho -->
    <div style="background-color: #064E3B; padding: 36px 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase;">
        Dra. Ana Carla Morong
      </h1>
      <p style="margin: 6px 0 0; font-size: 13px; color: #A7F3D0; font-weight: 500; letter-spacing: 0.5px;">
        Medicina de Precisão & Longevidade Saudável
      </p>
      <p style="margin: 4px 0 0; font-size: 11px; color: #6EE7B7;">
        CRM/SC 28412 • CNPJ: 54.811.772/0001-32 • Florianópolis - SC
      </p>
    </div>

    <!-- Conteúdo do E-mail -->
    <div style="padding: 32px 28px;">
      ${bodyHtml}
    </div>

    <!-- Rodapé Oficial -->
    <div style="background-color: #F8FAFC; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11.5px; color: #64748b; line-height: 1.6;">
      <p style="margin: 0 0 4px; font-weight: 700; color: #334155;">Clínica Médica Dra. Ana Carla Morong</p>
      <p style="margin: 0 0 8px;">Florianópolis - SC • WhatsApp: (48) 98857-2882</p>
      <p style="margin: 0; font-size: 10.5px; color: #94a3b8;">
        Este e-mail é confidencial e direcionado exclusivamente ao destinatário.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "---";
  const parts = iso.slice(0, 10).split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return iso;
}

function translatePlanStatus(status: string): string {
  switch (status) {
    case "proposed":
      return "Proposta Aberta";
    case "signed_pending_payment":
      return "Assinado - Aguardando Pagamento";
    case "active":
      return "Ativo em Vigência";
    case "paused":
      return "Pausado";
    case "completed":
      return "Concluído";
    case "renewed":
      return "Renovado";
    case "lost":
      return "Não Fechou / Perdido";
    default:
      return status;
  }
}
