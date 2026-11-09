import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  DEFAULT_MARGIN_CONFIG, appointmentPlanPayable, budgetEntryTier, resolveTierCommitment, sanitizeBudgetFallback, type PricedTarget,
} from "../../supabase/functions/_shared/pricingModes";
import {
  BUDGET_QUESTION, budgetFallbackRequest, budgetOfferAnswer, isBudgetHesitation, parseMonthlyBudget, readBudgetOffer,
} from "@/lib/pricing/budgetFallback";

const TIERS = [{ cents: 10000, label: "Commencer" }, { cents: 20000, label: "Développer" }, { cents: 35000, label: "Accélérer" }, { cents: 50000, label: "Croissance" }] as const;
const chain = (perAppt: number, base = 4900) => (target: number): PricedTarget => ({ target, plan_code: "pro_v2", monthly_price_cents: base + target * perAppt, capacity_capped: false });
const commit = (tierCents: number, perAppt = 9000, over: Record<string, unknown> = {}) =>
  resolveTierCommitment({ tier_cents: tierCents, target_monthly_appointments: 80, market_ceiling: null, contractor_capacity: 80, market_unavailable: false, margin: DEFAULT_MARGIN_CONFIG, ...over }, chain(perAppt));

describe("Clara budget fallback — question and free budget", () => {
  it("asks exactly the approved single question", () => {
    expect(BUDGET_QUESTION).toBe("Avec quel budget mensuel seriez-vous à l'aise pour commencer?");
  });
  it("detects hesitation, not plain agreement", () => {
    for (const t of ["C'est trop cher", "Je veux commencer petit", "Je ne suis pas certain", "j'hésite"]) expect(isBudgetHesitation(t)).toBe(true);
    expect(isBudgetHesitation("Oui, allons-y")).toBe(false);
  });
  it("accepts any positive monthly amount, refuses ranges or zero", () => {
    expect(parseMonthlyBudget("100")).toBe(100);
    expect(parseMonthlyBudget("250 $/mois")).toBe(250);
    expect(parseMonthlyBudget("1 000 $ par mois")).toBe(1000);
    expect(parseMonthlyBudget("175,50 $")).toBe(175.5);
    expect(parseMonthlyBudget("entre 200 et 300")).toBeNull();
    expect(parseMonthlyBudget("0")).toBeNull();
    expect(parseMonthlyBudget("je sais pas")).toBeNull();
  });
});

describe("budget → engagement → checkout gate", () => {
  it("entry agreement never exceeds the stated budget", () => {
    expect(budgetEntryTier(25000, TIERS)?.cents).toBe(20000);
    expect(budgetEntryTier(50000, TIERS)?.cents).toBe(50000);
    expect(budgetEntryTier(100000, TIERS)?.cents).toBe(50000);
    expect(budgetEntryTier(9900, TIERS)).toBeNull();
    // A higher tier requested above the budget is ignored.
    expect(budgetEntryTier(25000, TIERS, 35000)?.cents).toBe(20000);
    expect(budgetEntryTier(40000, TIERS, 20000)?.cents).toBe(20000);
  });

  it("250 $ budget: solved volume is what Clara announces and what checkout accepts", () => {
    const tier = budgetEntryTier(25000, TIERS)!;
    const c = commit(tier.cents);
    expect(c.monthly_appointments).toBeGreaterThan(0);
    expect(c.monthly_appointments).toBeLessThan(80);
    const gate = appointmentPlanPayable(tier.cents, c.monthly_appointments);
    expect(gate.payable).toBe(true);
    const offer = readBudgetOffer({ recommended_monthly_price: tier.cents, guaranteed_appointments: c.monthly_appointments }, 250);
    expect(offer).toEqual({ kind: "offer", budget: 250, monthlyCents: 20000, included: c.monthly_appointments, unusedCents: 5000 });
    const answer = budgetOfferAnswer(offer, 80);
    expect(answer.startsWith("Avec 250 $/mois, voici ce que nous pouvons vous offrir")).toBe(true);
    expect(answer).toContain(`${c.monthly_appointments} rendez-vous`);
    expect(answer).toContain("objectif de 80 RDV/mois reste noté");
  });

  it("budget too small for one deliverable appointment: no monthly plan, Présence IA proposed", () => {
    expect(budgetEntryTier(8000, TIERS)).toBeNull();
    const offer = readBudgetOffer({ recommended_monthly_price: 4900, guaranteed_appointments: 0 }, 80);
    expect(offer.kind).toBe("insufficient");
    expect(appointmentPlanPayable(4900, 0).payable).toBe(false);
    expect(budgetOfferAnswer(offer, 80)).toContain("Présence IA seule (350 $ + taxes, paiement unique)");
  });

  it("tier fits budget but market cannot deliver: still not sold", () => {
    const c = commit(20000, 9000, { market_ceiling: 0 });
    expect(c.monthly_appointments).toBe(0);
    expect(readBudgetOffer({ recommended_monthly_price: 20000, guaranteed_appointments: 0 }, 250).kind).toBe("insufficient");
  });

  it("a server price above the budget is never presented as an offer", () => {
    expect(readBudgetOffer({ recommended_monthly_price: 35000, guaranteed_appointments: 3 }, 250).kind).toBe("insufficient");
  });
});

describe("initial objective and fallback budget are both kept", () => {
  const original = { id: "11111111-1111-4111-8111-111111111111", target_monthly_appointments: 80, input_payload: { trade_primary: "Paysagiste", target_monthly_appointments: 80, goal_amount: 200000, pricing_mode: "goal" } };
  it("request keeps objectives, switches only to budget mode", () => {
    const body = budgetFallbackRequest(original as never, 250);
    expect(body.pricing_mode).toBe("budget");
    expect(body.monthly_budget_cents).toBe(25000);
    expect(body.target_monthly_appointments).toBe(80);
    expect(body.goal_amount).toBe(200000);
    expect(body.budget_fallback).toMatchObject({ from_quote_id: original.id, initial_target_monthly_appointments: 80, initial_goal_amount: 200000, reason: "hesitation" });
  });
  it("changing the budget again stays anchored to the original objective quote", () => {
    const fallbackQuote = { id: "22222222-2222-4222-8222-222222222222", target_monthly_appointments: 1, input_payload: { ...budgetFallbackRequest(original as never, 250), budget_fallback: { from_quote_id: original.id, initial_target_monthly_appointments: 80, initial_goal_amount: 200000 } } };
    const body = budgetFallbackRequest(fallbackQuote as never, 100);
    expect(body.budget_fallback).toMatchObject({ from_quote_id: original.id, initial_target_monthly_appointments: 80, reason: "budget_change" });
  });
  it("server whitelists the context and takes the budget from the solved request", () => {
    expect(sanitizeBudgetFallback({ from_quote_id: "not-a-uuid", initial_target_monthly_appointments: 80, extra: "x" }, 25000))
      .toEqual({ from_quote_id: null, initial_target_monthly_appointments: 80, initial_goal_amount: null, monthly_budget_cents: 25000, reason: "hesitation", surface: "plan_clara_budget" });
    expect(sanitizeBudgetFallback({ from_quote_id: original.id }, 0)).toBeNull();
  });
  it("server wiring: budget mode uses the budget-capped tier and stores the sanitized context", () => {
    const q = readFileSync("supabase/functions/compute-pricing-quote/index.ts", "utf8");
    expect(q).toContain("budgetEntryTier(monthlyBudgetCents ?? 0, ENTRY_TIERS, body.entry_tier_cents)");
    expect(q).toContain("sanitizeBudgetFallback((body as unknown as Record<string, unknown>).budget_fallback, monthlyBudgetCents)");
  });
});
