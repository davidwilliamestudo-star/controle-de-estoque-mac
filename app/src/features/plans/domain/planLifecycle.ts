/**
 * planLifecycle.ts - regras puras (sem banco, sem React) do ciclo de vida do plano.
 * Datas de vigencia sao strings "YYYY-MM-DD" (sem fuso). Follow-ups usam ISO completo.
 */

export type PlanStatus =
  | "draft"
  | "proposed"
  | "signed_pending_payment"
  | "active"
  | "completed"
  | "renewed"
  | "lost"
  | "cancelled";

/** Estado derivado, calculado na leitura (nunca gravado). */
export type PlanHealth =
  | "not_started"
  | "paused"
  | "ok"
  | "renewal_window"
  | "expired"
  | "ended";

export interface PlanPause {
  pausedFrom: string; // YYYY-MM-DD
  pausedTo: string | null; // null = pausa em andamento
}

export const DEFAULT_RENEWAL_WINDOW_DAYS = 14;
export const DEFAULT_FOLLOWUP_FIRST_DAYS = 3;
export const DEFAULT_FOLLOWUP_REACTIVATION_DAYS = 60;

const DAY_MS = 86_400_000;

function parseDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) throw new Error(`Data invalida: ${iso}`);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayISO(now: Date = new Date()): string {
  // Data local (a clinica opera em horario de Brasilia), nao UTC.
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  return formatDate(new Date(parseDate(iso).getTime() + days * DAY_MS));
}

export function diffDays(fromISO: string, toISO: string): number {
  return Math.round((parseDate(toISO).getTime() - parseDate(fromISO).getTime()) / DAY_MS);
}

/** Soma meses preservando o dia; se nao existir (ex.: 31/jan + 1 mes) usa o ultimo dia do mes. */
export function addMonthsClamped(iso: string, months: number): string {
  const d = parseDate(iso);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return formatDate(target);
}

/** Fim base do plano: inicio + N meses - 1 dia (ex.: 30/10/2026 + 6m => 29/04/2027). */
export function computeBaseEndDate(startDate: string, durationMonths: number): string {
  return addDays(addMonthsClamped(startDate, durationMonths), -1);
}

/** Dias de pausa ate `asOf` (pausa aberta conta ate `asOf`). Intervalos inclusivos. */
export function totalPausedDays(pauses: PlanPause[], asOf: string): number {
  return pauses.reduce((sum, p) => {
    const end = p.pausedTo ?? asOf;
    const limit = end > asOf && p.pausedTo === null ? asOf : end;
    if (limit < p.pausedFrom) return sum;
    return sum + diffDays(p.pausedFrom, limit) + 1;
  }, 0);
}

/** Fim efetivo = fim base + dias pausados (a prorrogacao decidida pela clinica). */
export function computeEffectiveEndDate(
  baseEndDate: string,
  pauses: PlanPause[],
  asOf: string
): string {
  return addDays(baseEndDate, totalPausedDays(pauses, asOf));
}

export function isPausedOn(pauses: PlanPause[], asOf: string): boolean {
  return pauses.some((p) => p.pausedFrom <= asOf && (p.pausedTo === null || p.pausedTo >= asOf));
}

export interface PlanSnapshot {
  status: PlanStatus;
  startDate: string | null;
  baseEndDate: string | null;
  pauses: PlanPause[];
  includedProceduresTotal: number;
  /** Aplicacoes finalizadas e nao estornadas vinculadas ao plano (vem do banco). */
  proceduresUsed: number;
}

export interface PlanView {
  health: PlanHealth;
  effectiveEndDate: string | null;
  daysRemaining: number | null;
  progressPercent: number; // 0-100 do tempo decorrido
  sessionsRemaining: number | null; // null = sem pacote definido
  sessionsExhausted: boolean;
}

export function derivePlanView(
  plan: PlanSnapshot,
  asOf: string = todayISO(),
  renewalWindowDays: number = DEFAULT_RENEWAL_WINDOW_DAYS
): PlanView {
  const sessionsRemaining =
    plan.includedProceduresTotal > 0
      ? Math.max(0, plan.includedProceduresTotal - plan.proceduresUsed)
      : null;
  const sessionsExhausted = sessionsRemaining === 0;

  if (plan.status !== "active" || !plan.startDate || !plan.baseEndDate) {
    const ended = ["completed", "renewed", "lost", "cancelled"].includes(plan.status);
    return {
      health: ended ? "ended" : "not_started",
      effectiveEndDate: plan.baseEndDate,
      daysRemaining: null,
      progressPercent: ended ? 100 : 0,
      sessionsRemaining,
      sessionsExhausted,
    };
  }

  const effectiveEnd = computeEffectiveEndDate(plan.baseEndDate, plan.pauses, asOf);
  const daysRemaining = diffDays(asOf, effectiveEnd);
  const totalSpan = Math.max(1, diffDays(plan.startDate, effectiveEnd) + 1);
  const elapsed = Math.min(totalSpan, Math.max(0, diffDays(plan.startDate, asOf) + 1));
  const progressPercent = Math.round((elapsed / totalSpan) * 100);

  let health: PlanHealth = "ok";
  if (isPausedOn(plan.pauses, asOf)) health = "paused";
  else if (daysRemaining < 0) health = "expired";
  else if (daysRemaining <= renewalWindowDays) health = "renewal_window";

  return { health, effectiveEndDate: effectiveEnd, daysRemaining, progressPercent, sessionsRemaining, sessionsExhausted };
}

/** Plano aceita novas aplicacoes vinculadas? Pos-vencimento vira avulsa (regra definida pela clinica). */
export function canLinkProcedure(view: PlanView, status: PlanStatus): boolean {
  return status === "active" && view.health !== "expired";
}

export type ChargeMode = "included" | "discounted_extra" | "full_price";

export function suggestChargeMode(
  view: PlanView,
  allowsDiscountedExtras: boolean
): ChargeMode {
  if (view.sessionsRemaining === null) return "included";
  if (view.sessionsRemaining > 0) return "included";
  return allowsDiscountedExtras ? "discounted_extra" : "full_price";
}

/** Fluxo permitido de status (negocio). Derivados nao entram aqui. */
const TRANSITIONS: Record<PlanStatus, PlanStatus[]> = {
  draft: ["proposed", "cancelled"],
  proposed: ["signed_pending_payment", "active", "lost", "cancelled"],
  signed_pending_payment: ["active", "lost", "cancelled"],
  active: ["completed", "renewed", "cancelled"],
  completed: ["renewed"],
  renewed: [],
  lost: ["proposed"],
  cancelled: [],
};

export function canTransition(from: PlanStatus, to: PlanStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export interface ActivationDates {
  startDate: string;
  baseEndDate: string;
}

/** Ativacao (apos pagamento): inicio padrao = hoje, editavel. */
export function computeActivationDates(
  durationMonths: number,
  startDate: string = todayISO()
): ActivationDates {
  return { startDate, baseEndDate: computeBaseEndDate(startDate, durationMonths) };
}

/** Proximo contato padrao (3 dias no fechamento, 60 dias na reativacao); editavel entre 1 e 90. */
export function nextFollowupISO(
  kind: "closing" | "reactivation",
  from: Date = new Date(),
  settings?: { firstDays?: number; reactivationDays?: number }
): string {
  const days =
    kind === "closing"
      ? settings?.firstDays ?? DEFAULT_FOLLOWUP_FIRST_DAYS
      : settings?.reactivationDays ?? DEFAULT_FOLLOWUP_REACTIVATION_DAYS;
  const safe = Math.min(90, Math.max(1, Math.round(days)));
  return `${addDays(todayISO(from), safe)}T10:00:00`;
}

