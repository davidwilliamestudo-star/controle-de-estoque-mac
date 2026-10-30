/**
 * patientPlans.repository.ts
 * Persistencia dos planos Saude 360 (funciona em Tauri/SQLite e Web/D1 via dbSelect/dbExecute).
 */
import { dbSelect, dbExecute, dbTransaction } from "@/lib/db/sqlite";
import { getStoredAuthSession } from "@/features/auth/session";
import {
  type PlanStatus,
  type PlanPause,
  type PlanSnapshot,
  type PlanView,
  canTransition,
  computeActivationDates,
  derivePlanView,
  nextFollowupISO,
  todayISO,
  DEFAULT_RENEWAL_WINDOW_DAYS,
} from "../domain/planLifecycle";

const CLINIC_ID = "ana-morong-clinic";

export interface PatientPlan {
  id: string;
  patientId: string;
  planKey: string;
  planName: string;
  durationMonths: number;
  status: PlanStatus;
  startDate: string | null;
  baseEndDate: string | null;
  endDate: string | null;
  totalValue: number;
  paymentModality: string | null;
  paymentStatus: "pending" | "partial" | "paid";
  paymentReceivableId: string | null;
  includedProceduresTotal: number;
  allowsDiscountedExtras: boolean;
  extraDiscountPercent: number;
  documentId: string | null;
  parentPlanId: string | null;
  nextFollowupAt: string | null;
  lostReason: string | null;
  notes: string | null;
  createdAt: string;
}

export interface PatientPlanWithView extends PatientPlan {
  pauses: PlanPause[];
  proceduresUsed: number;
  view: PlanView;
}

export interface AddFollowupInput {
  planId: string;
  kind?: "closing" | "renewal" | "reactivation";
  channel: "whatsapp" | "phone" | "in_person" | "email";
  outcome: "no_answer" | "callback_requested" | "negotiating" | "won" | "lost";
  notes?: string;
  lostReason?: string;
  nextContactAt?: string | null;
}

export interface CreateProposalInput {
  patientId: string;
  planKey: string;
  planName: string;
  durationMonths: number;
  totalValue: number;
  paymentModality?: string | null;
  includedProceduresTotal?: number;
  documentId?: string | null;
  parentPlanId?: string | null;
  leadSource?: string | null;
  notes?: string | null;
}

type Row = Record<string, unknown>;

function mapPlan(r: Row): PatientPlan {
  return {
    id: String(r.id),
    patientId: String(r.patient_id),
    planKey: String(r.plan_key),
    planName: String(r.plan_name),
    durationMonths: Number(r.duration_months || 0),
    status: r.status as PlanStatus,
    startDate: (r.start_date as string) || null,
    baseEndDate: (r.base_end_date as string) || null,
    endDate: (r.end_date as string) || null,
    totalValue: Number(r.total_value || 0),
    paymentModality: (r.payment_modality as string) || null,
    paymentStatus: (r.payment_status as PatientPlan["paymentStatus"]) || "pending",
    paymentReceivableId: (r.payment_receivable_id as string) || null,
    includedProceduresTotal: Number(r.included_procedures_total || 0),
    allowsDiscountedExtras: Number(r.allows_discounted_extras ?? 1) === 1,
    extraDiscountPercent: Number(r.extra_discount_percent || 0),
    documentId: (r.document_id as string) || null,
    parentPlanId: (r.parent_plan_id as string) || null,
    nextFollowupAt: (r.next_followup_at as string) || null,
    lostReason: (r.lost_reason as string) || null,
    notes: (r.notes as string) || null,
    createdAt: String(r.created_at || ""),
  };
}

async function readSetting(key: string): Promise<string | null> {
  try {
    const rows = await dbSelect<{ value: string }>(
      `SELECT value FROM settings WHERE clinic_id = ? AND key = ? LIMIT 1`,
      [CLINIC_ID, key]
    );
    return rows[0]?.value ?? null;
  } catch {
    return null;
  }
}

async function writeAudit(action: string, planId: string, description: string, before?: unknown, after?: unknown) {
  try {
    const userId = getStoredAuthSession()?.userId ?? null;
    await dbExecute(
      `INSERT INTO audit_logs (id, clinic_id, user_id, action, entity_type, entity_id, description, before_data, after_data)
       VALUES (?, ?, ?, ?, 'patient_plan', ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        CLINIC_ID,
        userId,
        action,
        planId,
        description,
        before ? JSON.stringify(before) : null,
        after ? JSON.stringify(after) : null,
      ]
    );
  } catch (err) {
    // Auditoria nunca deve impedir a operacao clinica
    console.warn("audit_logs (patient_plan) falhou:", err);
  }
}

export const patientPlansRepository = {
  async getById(planId: string): Promise<PatientPlan | null> {
    const rows = await dbSelect<Row>(
      `SELECT * FROM patient_plans WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
      [planId]
    );
    return rows[0] ? mapPlan(rows[0]) : null;
  },

  /** Cria a proposta ao gerar o contrato (status 'proposed') e agenda o 1o follow-up. */
  async createProposal(input: CreateProposalInput): Promise<PatientPlan> {
    const id = crypto.randomUUID();
    const firstDays = Number(await readSetting("followup_first_days")) || undefined;
    const nextFollowup = nextFollowupISO("closing", new Date(), { firstDays });
    const userId = getStoredAuthSession()?.userId ?? null;

    await dbExecute(
      `INSERT INTO patient_plans (
         id, clinic_id, patient_id, plan_key, plan_name, duration_months, status,
         total_value, payment_modality, included_procedures_total, document_id,
         parent_plan_id, lead_source, notes, next_followup_at, created_by_user_id
       ) VALUES (?, ?, ?, ?, ?, ?, 'proposed', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        CLINIC_ID,
        input.patientId,
        input.planKey,
        input.planName,
        input.durationMonths,
        input.totalValue,
        input.paymentModality ?? null,
        Math.max(0, Math.round(input.includedProceduresTotal ?? 0)),
        input.documentId ?? null,
        input.parentPlanId ?? null,
        input.leadSource ?? null,
        input.notes ?? null,
        nextFollowup,
        userId,
      ]
    );
    await writeAudit("plan.created", id, `Proposta criada: ${input.planName}`, null, input);
    const created = await this.getById(id);
    if (!created) throw new Error("Falha ao criar o plano do paciente.");
    return created;
  },

  /**
   * Garante coerencia: contratos ja concluidos cujo plano continua 'proposed'
   * (webhook indisponivel, uso offline no Tauri) passam a 'signed_pending_payment'.
   */
  async reconcileSignedPlans(patientId?: string): Promise<void> {
    await dbExecute(
      `UPDATE patient_plans
       SET status = 'signed_pending_payment',
           closed_at = COALESCE(closed_at, datetime('now')),
           updated_at = datetime('now')
       WHERE status IN ('draft','proposed')
         AND deleted_at IS NULL
         AND document_id IS NOT NULL
         AND (? IS NULL OR patient_id = ?)
         AND EXISTS (SELECT 1 FROM documents d WHERE d.id = patient_plans.document_id AND d.status = 'completed')`,
      [patientId ?? null, patientId ?? null]
    );
  },

  async listByPatient(patientId: string): Promise<PatientPlanWithView[]> {
    await this.reconcileSignedPlans(patientId).catch(() => undefined);
    const rows = await dbSelect<Row>(
      `SELECT * FROM patient_plans WHERE patient_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
      [patientId]
    );
    return this.withViews(rows.map(mapPlan));
  },

  async getActiveForPatient(patientId: string): Promise<PatientPlanWithView | null> {
    const rows = await dbSelect<Row>(
      `SELECT * FROM patient_plans WHERE patient_id = ? AND status = 'active' AND deleted_at IS NULL LIMIT 1`,
      [patientId]
    );
    if (!rows[0]) return null;
    return (await this.withViews([mapPlan(rows[0])]))[0];
  },

  async withViews(plans: PatientPlan[]): Promise<PatientPlanWithView[]> {
    const windowDays =
      Number(await readSetting("renewal_window_days")) || DEFAULT_RENEWAL_WINDOW_DAYS;
    const asOf = todayISO();
    const result: PatientPlanWithView[] = [];
    for (const plan of plans) {
      const pauses = await this.listPauses(plan.id);
      const proceduresUsed = await this.countIncludedProcedures(plan.id);
      const snapshot: PlanSnapshot = {
        status: plan.status,
        startDate: plan.startDate,
        baseEndDate: plan.baseEndDate,
        pauses,
        includedProceduresTotal: plan.includedProceduresTotal,
        proceduresUsed,
      };
      result.push({ ...plan, pauses, proceduresUsed, view: derivePlanView(snapshot, asOf, windowDays) });
    }
    return result;
  },

  /** Sessoes que consomem o pacote: finalizadas, nao corrigidas e cobradas como 'incluida'. */
  async countIncludedProcedures(planId: string): Promise<number> {
    const rows = await dbSelect<{ total: number }>(
      `SELECT COUNT(*) AS total FROM procedures
       WHERE patient_plan_id = ? AND status = 'finalized' AND deleted_at IS NULL
         AND COALESCE(is_corrected, 0) = 0
         AND COALESCE(plan_charge_mode, 'included') = 'included'`,
      [planId]
    );
    return Number(rows[0]?.total ?? 0);
  },

  async listPauses(planId: string): Promise<PlanPause[]> {
    const rows = await dbSelect<Row>(
      `SELECT paused_from, paused_to FROM patient_plan_pauses
       WHERE patient_plan_id = ? AND deleted_at IS NULL ORDER BY paused_from ASC`,
      [planId]
    );
    return rows.map((r) => ({
      pausedFrom: String(r.paused_from),
      pausedTo: (r.paused_to as string) || null,
    }));
  },

  /**
   * Confirma o pagamento e ATIVA o plano (decisao: so ativa apos pagamento).
   * Em renovacao, o plano anterior passa a 'renewed' na mesma transacao.
   */
  async confirmPaymentAndActivate(
    planId: string,
    opts: { startDate?: string; receivableId?: string | null } = {}
  ): Promise<PatientPlan> {
    const plan = await this.getById(planId);
    if (!plan) throw new Error("Plano nao encontrado.");
    if (!canTransition(plan.status, "active")) {
      throw new Error(`Plano em "${plan.status}" nao pode ser ativado.`);
    }
    const existing = await this.getActiveForPatient(plan.patientId);
    if (existing && existing.id !== plan.id && existing.id !== plan.parentPlanId) {
      throw new Error("O paciente ja possui um plano ativo. Encerre ou renove o plano atual primeiro.");
    }
    const { startDate, baseEndDate } = computeActivationDates(plan.durationMonths, opts.startDate);

    await dbTransaction(async () => {
      if (plan.parentPlanId) {
        await dbExecute(
          `UPDATE patient_plans SET status = 'renewed', updated_at = datetime('now')
           WHERE id = ? AND status IN ('active','completed')`,
          [plan.parentPlanId]
        );
      }
      await dbExecute(
        `UPDATE patient_plans
         SET status = 'active', payment_status = 'paid',
             payment_receivable_id = COALESCE(?, payment_receivable_id),
             start_date = ?, base_end_date = ?, end_date = ?,
             activated_at = datetime('now'), closed_at = COALESCE(closed_at, datetime('now')),
             next_followup_at = NULL, updated_at = datetime('now')
         WHERE id = ?`,
        [opts.receivableId ?? null, startDate, baseEndDate, baseEndDate, planId]
      );
    });
    await writeAudit("plan.activated", planId, `Plano ativado (${startDate} a ${baseEndDate})`);
    return (await this.getById(planId))!;
  },

  /** Altera a quantidade de sessoes incluidas (campo editavel pela clinica) com auditoria. */
  async updateIncludedProcedures(planId: string, total: number, reason?: string): Promise<void> {
    const plan = await this.getById(planId);
    if (!plan) throw new Error("Plano nao encontrado.");
    const safe = Math.max(0, Math.round(total));
    await dbExecute(
      `UPDATE patient_plans SET included_procedures_total = ?, updated_at = datetime('now') WHERE id = ?`,
      [safe, planId]
    );
    await writeAudit(
      "plan.sessions_changed",
      planId,
      `Sessoes incluidas: ${plan.includedProceduresTotal} -> ${safe}${reason ? ` (${reason})` : ""}`,
      { included: plan.includedProceduresTotal },
      { included: safe }
    );
  },

  async markLost(planId: string, reason: string, notes?: string): Promise<void> {
    const plan = await this.getById(planId);
    if (!plan) throw new Error("Plano nao encontrado.");
    if (!reason.trim()) throw new Error("Informe o motivo para registrar a perda.");
    if (!canTransition(plan.status, "lost")) {
      throw new Error(`Plano em "${plan.status}" nao pode ser marcado como perdido.`);
    }
    const days = Number(await readSetting("followup_reactivation_days")) || undefined;
    const reactivation = nextFollowupISO("reactivation", new Date(), { reactivationDays: days });
    await dbExecute(
      `UPDATE patient_plans
       SET status = 'lost', lost_reason = ?, lost_at = datetime('now'),
           next_followup_at = ?, notes = COALESCE(?, notes), updated_at = datetime('now')
       WHERE id = ?`,
      [reason.trim(), reactivation, notes?.trim() || null, planId]
    );
    await writeAudit("plan.lost", planId, `Proposta marcada como perdida: ${reason}`);
  },

  async reopenLost(planId: string): Promise<void> {
    const plan = await this.getById(planId);
    if (!plan || !canTransition(plan.status, "proposed")) {
      throw new Error("Somente planos perdidos podem ser reabertos.");
    }
    await dbExecute(
      `UPDATE patient_plans SET status = 'proposed', lost_reason = NULL, lost_at = NULL,
         updated_at = datetime('now') WHERE id = ?`,
      [planId]
    );
    await writeAudit("plan.reopened", planId, "Proposta reaberta para negociacao");
  },

  /** Registra contato (follow-up) e atualiza o proximo contato do plano na mesma transacao. */
  async addFollowup(input: AddFollowupInput): Promise<void> {
    const userId = getStoredAuthSession()?.userId ?? null;
    const kind = input.kind || "closing";
    if (input.outcome === "lost" && !input.lostReason?.trim()) {
      throw new Error("Informe o motivo da perda.");
    }
    await dbTransaction(async () => {
      await dbExecute(
        `INSERT INTO patient_plan_followups (
           id, clinic_id, patient_plan_id, kind, channel, outcome, lost_reason,
           notes, contacted_at, next_contact_at, created_by_user_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)`,
        [
          crypto.randomUUID(),
          CLINIC_ID,
          input.planId,
          kind,
          input.channel,
          input.outcome,
          input.lostReason?.trim() || null,
          input.notes?.trim() || null,
          input.nextContactAt ?? null,
          userId,
        ]
      );
      // Ganhou/perdeu encerra a fila; os demais reagendam
      const next = input.outcome === "won" || input.outcome === "lost" ? null : input.nextContactAt ?? null;
      await dbExecute(
        `UPDATE patient_plans SET next_followup_at = ?, updated_at = datetime('now') WHERE id = ?`,
        [next, input.planId]
      );
    });
    if (input.outcome === "lost") {
      await this.markLost(input.planId, input.lostReason!);
    }
  },

  /** Fila de contatos: propostas/renovacoes com contato vencido ou ate o fim do periodo informado. */
  async listFollowupQueue(untilISO: string = `${todayISO()}T23:59:59`): Promise<Array<PatientPlan & { patientName: string; patientPhone?: string }>> {
    const rows = await dbSelect<Row>(
      `SELECT pp.*, p.full_name AS patient_name, p.phone AS patient_phone
       FROM patient_plans pp JOIN patients p ON p.id = pp.patient_id
       WHERE pp.deleted_at IS NULL AND pp.next_followup_at IS NOT NULL
         AND pp.next_followup_at <= ?
       ORDER BY pp.next_followup_at ASC`,
      [untilISO]
    );
    return rows.map((r) => ({
      ...mapPlan(r),
      patientName: String(r.patient_name),
      patientPhone: (r.patient_phone as string) || undefined,
    }));
  },

  /** Pausa o plano (a vigencia sera prorrogada pelos dias pausados). */
  async pause(planId: string, from: string = todayISO(), reason?: string): Promise<void> {
    const plan = await this.getById(planId);
    if (!plan || plan.status !== "active") throw new Error("Somente planos ativos podem ser pausados.");
    const open = await dbSelect<Row>(
      `SELECT id FROM patient_plan_pauses WHERE patient_plan_id = ? AND paused_to IS NULL AND deleted_at IS NULL`,
      [planId]
    );
    if (open.length > 0) throw new Error("O plano ja esta pausado.");
    await dbExecute(
      `INSERT INTO patient_plan_pauses (id, clinic_id, patient_plan_id, paused_from, reason, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), CLINIC_ID, planId, from, reason ?? null, getStoredAuthSession()?.userId ?? null]
    );
    await writeAudit("plan.paused", planId, `Plano pausado desde ${from}${reason ? `: ${reason}` : ""}`);
  },

  /** Retoma o plano e grava o novo fim efetivo. `to` e o ultimo dia pausado (inclusive). */
  async resume(planId: string, to: string = todayISO()): Promise<void> {
    const plan = await this.getById(planId);
    if (!plan || !plan.baseEndDate) throw new Error("Plano nao encontrado ou sem vigencia.");
    const rows = await dbSelect<Row>(
      `SELECT id, paused_from FROM patient_plan_pauses
       WHERE patient_plan_id = ? AND paused_to IS NULL AND deleted_at IS NULL LIMIT 1`,
      [planId]
    );
    if (!rows[0]) throw new Error("O plano nao esta pausado.");
    if (to < String(rows[0].paused_from)) throw new Error("A retomada nao pode ser anterior ao inicio da pausa.");
    await dbExecute(
      `UPDATE patient_plan_pauses SET paused_to = ?, updated_at = datetime('now') WHERE id = ?`,
      [to, rows[0].id]
    );
    const pauses = await this.listPauses(planId);
    const view = derivePlanView(
      {
        status: "active",
        startDate: plan.startDate,
        baseEndDate: plan.baseEndDate,
        pauses,
        includedProceduresTotal: plan.includedProceduresTotal,
        proceduresUsed: 0,
      },
      to
    );
    await dbExecute(`UPDATE patient_plans SET end_date = ?, updated_at = datetime('now') WHERE id = ?`, [
      view.effectiveEndDate,
      planId,
    ]);
    await writeAudit("plan.resumed", planId, `Plano retomado em ${to}; novo termino ${view.effectiveEndDate}`);
  },

  /** Planos ativos na janela de renovacao (dashboard / lista de renovacoes). */
  async listRenewalWindow(): Promise<Array<PatientPlanWithView & { patientName: string }>> {
    const rows = await dbSelect<Row>(
      `SELECT pp.*, p.full_name AS patient_name
       FROM patient_plans pp JOIN patients p ON p.id = pp.patient_id
       WHERE pp.status = 'active' AND pp.deleted_at IS NULL`
    );
    const names = new Map(rows.map((r) => [String(r.id), String(r.patient_name)]));
    const withViews = await this.withViews(rows.map(mapPlan));
    return withViews
      .filter((p) => p.view.health === "renewal_window" || p.view.health === "expired")
      .sort((a, b) => (a.view.daysRemaining ?? 0) - (b.view.daysRemaining ?? 0))
      .map((p) => ({ ...p, patientName: names.get(p.id) || "" }));
  },
};
