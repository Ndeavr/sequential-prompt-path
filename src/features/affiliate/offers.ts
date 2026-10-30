/**
 * UNPRO — Offres affilié (logique pure).
 * Deux offres : Activation 350 $ (paiement unique, HT) et Plan personnalisé (devis serveur).
 * Aucun chiffre inventé : inconnu = null (« À déterminer »), jamais 0.
 */
export const ACTIVATION_PRICE_CENTS = 35000;
export const PROJECTION_MONTHS = 24;

export type OfferType = "activation_350" | "personnalise" | "a_definir";
export const OFFER_LABELS: Record<OfferType, string> = {
  activation_350: "Activation 350 $",
  personnalise: "Plan personnalisé",
  a_definir: "À définir",
};

/** Taux serveur : commission_rate (0–1) ou commission_pct (0–100). Inconnu → null. */
export function resolveRate(row: { commission_rate?: number | null; commission_pct?: number | null } | null): number | null {
  if (!row) return null;
  const r = row.commission_rate;
  if (typeof r === "number" && r >= 0 && r <= 1) return r;
  const p = row.commission_pct;
  if (typeof p === "number" && p >= 0 && p <= 100) return p / 100;
  return null;
}

/** Commission estimée UNIQUE sur l'activation (hors taxes). */
export function activationCommissionCents(rate: number | null): number | null {
  return rate == null ? null : Math.round(ACTIVATION_PRICE_CENTS * rate);
}

/** Commission estimée récurrente mensuelle : seulement si prix mensuel serveur et taux connus. */
export function recurringCommissionCents(monthlyCents: number | null | undefined, rate: number | null): number | null {
  if (rate == null || monthlyCents == null || !Number.isFinite(monthlyCents) || monthlyCents < 0) return null;
  return Math.round(monthlyCents * rate);
}

/** Projection 24 mois (hypothèse) : seulement si la récurrence est connue. */
export function projection24Cents(monthlyCommission: number | null): number | null {
  return monthlyCommission == null ? null : monthlyCommission * PROJECTION_MONTHS;
}

export type ProposalRow = {
  recommended_plan_slug?: string | null;
  monthly_price_cents?: number | null;
  used_at?: string | null;
  paid_at?: string | null;
  payload?: Record<string, unknown> | null;
};

export function offerTypeOf(p: ProposalRow | null): OfferType {
  if (!p) return "a_definir";
  const kind = (p.payload as any)?.offer_type;
  if (kind === "activation_350" || p.recommended_plan_slug === "activation_350") return "activation_350";
  if (kind === "personnalise" || (p.monthly_price_cents ?? 0) > 0) return "personnalise";
  return "a_definir";
}

export type ProposalStatus = "brouillon" | "prete" | "envoyee" | "acceptee" | "paiement_a_verifier";
export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  brouillon: "Brouillon",
  prete: "Prête",
  envoyee: "Envoyée",
  acceptee: "Acceptée",
  paiement_a_verifier: "Paiement signalé — à vérifier",
};

/** paid_at est un indicateur CRM, PAS une preuve Stripe LIVE + webhook signé + droit de 12 mois. */
export function proposalStatusOf(p: ProposalRow | null): ProposalStatus | null {
  if (!p) return null;
  if (p.paid_at) return "paiement_a_verifier";
  if (p.used_at) return "acceptee";
  if ((p.payload as any)?.sent_at) return "envoyee";
  if ((p.payload as any)?.ready_at) return "prete";
  return "brouillon";
}

export function formatCad(cents: number | null): string {
  if (cents == null) return "À déterminer";
  return (cents / 100).toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: cents % 100 ? 2 : 0 });
}

/** Liens existants (aperçu seulement, aucun envoi). */
export function activationLink(origin: string, ref: string | null, prospectId: string): string {
  const u = new URL("/entrepreneurs/activation-350", origin);
  if (ref) u.searchParams.set("ref", ref);
  u.searchParams.set("prospect", prospectId);
  return u.toString();
}
export function customPlanLink(origin: string, ref: string | null, prospectId: string): string {
  const u = new URL("/entrepreneur/devis-personnalise", origin);
  if (ref) u.searchParams.set("ref", ref);
  u.searchParams.set("prospect", prospectId);
  return u.toString();
}
