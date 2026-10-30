import test from "node:test";
import assert from "node:assert/strict";
import * as P from "./planLifecycle.ts";

test("fim base: 6 meses a partir de 30/10/2026 => 29/04/2027", () => {
  assert.equal(P.computeBaseEndDate("2026-10-30", 6), "2027-04-29");
});
test("meses curtos: 31/08 + 6m => 28/02 (clamp) - 1 dia = 27/02", () => {
  assert.equal(P.computeBaseEndDate("2026-08-31", 6), "2027-02-27");
});
test("ano bissexto: 29/02/2028 + 12m => 28/02/2029 - 1 = 27/02/2029", () => {
  assert.equal(P.computeBaseEndDate("2028-02-29", 12), "2029-02-27");
});
test("pausa de 10 dias (inclusiva) prorroga 10 dias", () => {
  const pauses = [{ pausedFrom: "2026-12-01", pausedTo: "2026-12-10" }];
  assert.equal(P.totalPausedDays(pauses, "2027-01-01"), 10);
  assert.equal(P.computeEffectiveEndDate("2027-04-29", pauses, "2027-01-01"), "2027-05-09");
});
test("pausa aberta conta ate hoje e plano fica paused", () => {
  const pauses = [{ pausedFrom: "2026-12-01", pausedTo: null }];
  assert.equal(P.totalPausedDays(pauses, "2026-12-05"), 5);
  const v = P.derivePlanView({ status: "active", startDate: "2026-10-30", baseEndDate: "2027-04-29", pauses, includedProceduresTotal: 8, proceduresUsed: 2 }, "2026-12-05");
  assert.equal(v.health, "paused");
});
const base: P.PlanSnapshot = { status: "active", startDate: "2026-10-30", baseEndDate: "2027-04-29", pauses: [], includedProceduresTotal: 8, proceduresUsed: 8 };
test("janela de renovacao em 14 dias", () => {
  assert.equal(P.derivePlanView(base, "2027-04-15").health, "renewal_window"); // 14 dias
  assert.equal(P.derivePlanView(base, "2027-04-14").health, "ok"); // 15 dias
});
test("vencido e sessoes esgotadas", () => {
  const v = P.derivePlanView(base, "2027-05-01");
  assert.equal(v.health, "expired");
  assert.equal(v.sessionsExhausted, true);
  assert.equal(P.canLinkProcedure(v, "active"), false);
  assert.equal(P.suggestChargeMode(v, true), "discounted_extra");
  assert.equal(P.suggestChargeMode(v, false), "full_price");
});
test("pausa durante a janela adia o alerta de renovacao", () => {
  const withPause: P.PlanSnapshot = { ...base, pauses: [{ pausedFrom: "2027-03-01", pausedTo: "2027-03-30" }] }; // +30 dias
  assert.equal(P.derivePlanView(withPause, "2027-04-15").health, "ok");
});
test("transicoes", () => {
  assert.ok(P.canTransition("proposed", "signed_pending_payment"));
  assert.ok(P.canTransition("signed_pending_payment", "active"));
  assert.ok(!P.canTransition("lost", "active"));
  assert.ok(!P.canTransition("renewed", "active"));
});
test("follow-up padrao 3 e 60 dias", () => {
  const from = new Date(2026, 9, 30, 12);
  assert.equal(P.nextFollowupISO("closing", from), "2026-11-02T10:00:00");
  assert.equal(P.nextFollowupISO("reactivation", from), "2026-12-29T10:00:00");
});

