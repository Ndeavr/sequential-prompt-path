/**
 * Clara — repli budgétaire du forfait de rendez-vous (2 temps).
 *
 * 1) L'offre initiale découle des objectifs déclarés (devis serveur).
 * 2) Si l'entrepreneur hésite, Clara pose UNE question :
 *    « Avec quel budget mensuel seriez-vous à l'aise pour commencer? »
 *    Toute valeur positive est acceptée; le serveur (mode budget, palier
 *    jamais au-dessus du budget) calcule ce qui est réellement inclus.
 *
 * Aucun chiffre n'est inventé ici : les volumes, prix et engagements viennent
 * du devis serveur. L'objectif initial n'est jamais modifié.
 */
import { parseQuebecNumber } from "@/lib/formatting";
import { appointmentPlanPayable } from "../../../supabase/functions/_shared/pricingModes";
import type { PricingQuote } from "@/services/contractorPricingQuoteService";

export const BUDGET_QUESTION = "Avec quel budget mensuel seriez-vous à l'aise pour commencer?";

const fold = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Hésitation explicite : trop cher, pas certain, commencer petit, etc. */
export function isBudgetHesitation(text: string): boolean {
  const v = fold(text);
  return /\b(trop cher|cher|pas certain|pas sur|hesite|hesitation|commencer (petit|plus petit|doucement|tranquillement)|plus petit|moins cher|budget|pas les moyens|trop gros|ca fait beaucoup|c'est beaucoup)\b/.test(v);
}

/**
 * Budget mensuel déclaré en dollars (valeur positive, libre). Refuse les
 * réponses ambiguës (deux nombres, fourchette) plutôt que de deviner.
 */
export function parseMonthlyBudget(text: string): number | null {
  const v = fold(text)
    .replace(/\b(par|\/)\s*mois\b/g, " ")
    .replace(/\b(dollars?|piasses?|cad|\$|mensuel(lement)?|environ|autour de|a peu pres|max(imum)?)\b/g, " ")
    .replace(/\$/g, " ")
    .trim();
  // « 1 000 », « 1 000,50 » (espaces fines comprises) restent un seul nombre.
  const numbers = v.match(/\d[\d\s\u00a0\u202f]*(?:[.,]\d+)?/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  if (numbers.length !== 1) return null;
  if (/\d\s*(-|a|à|ou)\s*\d/.test(v)) return null;
  const n = parseQuebecNumber(numbers[0]);
  if (n === null || !Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

/** Corps du recalcul serveur : objectifs inchangés, seul le mode budget change. */
export function budgetFallbackRequest(quote: Pick<PricingQuote, "id" | "input_payload" | "target_monthly_appointments">, budgetDollars: number) {
  const p = (quote.input_payload ?? {}) as Record<string, unknown>;
  const prior = (p.budget_fallback ?? null) as { from_quote_id?: string | null; initial_target_monthly_appointments?: number | null; initial_goal_amount?: number | null } | null;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
  return {
    ...p,
    quote_id: undefined,
    entry_tier_cents: undefined,
    pricing_mode: "budget" as const,
    monthly_budget_cents: Math.round(budgetDollars * 100),
    budget_fallback: {
      // Toujours rattaché au devis de l'objectif initial (jamais au précédent repli).
      from_quote_id: prior?.from_quote_id ?? quote.id,
      initial_target_monthly_appointments: prior?.initial_target_monthly_appointments ?? num(p.target_monthly_appointments) ?? num(quote.target_monthly_appointments),
      initial_goal_amount: prior?.initial_goal_amount ?? num(p.goal_amount),
      reason: prior ? "budget_change" : "hesitation",
    },
  };
}

export type BudgetOffer =
  | { kind: "offer"; budget: number; monthlyCents: number; included: number; unusedCents: number }
  | { kind: "insufficient"; budget: number };

/** Lecture du devis serveur : seul un volume inclus positif fait une offre. */
export function readBudgetOffer(quote: Pick<PricingQuote, "recommended_monthly_price" | "guaranteed_appointments">, budget: number): BudgetOffer {
  const price = Math.round(Number(quote.recommended_monthly_price ?? 0));
  const gate = appointmentPlanPayable(price, quote.guaranteed_appointments ?? null);
  const budgetCents = Math.round(budget * 100);
  if (!(price > 0) || !gate.payable || gate.monthly_appointments <= 0 || price > budgetCents) return { kind: "insufficient", budget };
  return { kind: "offer", budget, monthlyCents: price, included: gate.monthly_appointments, unusedCents: Math.max(0, budgetCents - price) };
}

const money = (n: number) => `${new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 2 }).format(n)} $`;

/** Réponse de Clara, construite uniquement à partir du devis serveur. */
export function budgetOfferAnswer(offer: BudgetOffer, initialTarget: number | null): string {
  if (offer.kind === "insufficient") {
    return `Avec ${money(offer.budget)}/mois, nous ne pouvons pas encore inclure un rendez-vous exclusif dans votre métier et votre territoire. Aucun forfait mensuel ne vous sera facturé. Vous pouvez commencer avec la Présence IA seule (350 $ + taxes, paiement unique) ou indiquer un autre budget.`;
  }
  const monthly = money(offer.monthlyCents / 100);
  const goal = initialTarget && initialTarget > offer.included ? ` Votre objectif de ${initialTarget} RDV/mois reste noté : c'est un objectif, pas un nombre inclus.` : "";
  const rest = offer.unusedCents > 0 ? ` Le forfait coûte ${monthly}/mois avant taxes, sous votre budget.` : ` Le forfait coûte ${monthly}/mois avant taxes.`;
  return `Avec ${money(offer.budget)}/mois, voici ce que nous pouvons vous offrir : ${offer.included} rendez-vous qualifié${offer.included > 1 ? "s" : ""} exclusif${offer.included > 1 ? "s" : ""} inclus par mois.${rest}${goal}`;
}
