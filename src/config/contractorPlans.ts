/**
 * UNPRO — Contractor Plans Configuration
 * Single source of truth for plan pricing, features, and Stripe price IDs.
 */

export type BillingInterval = "month" | "year";

export interface ContractorPlan {
  id: string;
  name: string;
  monthlyPrice: number; // cents CAD — monthly
  yearlyPrice: number; // cents CAD — yearly total
  monthlyStripePriceId: string;
  yearlyStripePriceId: string;
  features: string[];
  appointmentAccessLevel: "limited" | "standard" | "priority" | "premium" | "exclusive";
  priorityLevel: number;
  matchingBoost: number;
  highlighted?: boolean;
}

export const CONTRACTOR_PLANS: ContractorPlan[] = [
  {
    id: "recrue",
    name: "Recrue",
    monthlyPrice: 4900,
    yearlyPrice: 49900, // ~15 % off
    monthlyStripePriceId: "price_1T9X6oCvZwK1QnPVG3tLbNqV",
    yearlyStripePriceId: "price_1T9X6oCvZwK1QnPVG3tLbNqY",
    features: [
      "Profil public de base",
      "Rendez-vous garantis classes S et M",
      "Score AIPP visible",
      "Support par courriel",
    ],
    appointmentAccessLevel: "limited",
    priorityLevel: 1,
    matchingBoost: 0,
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 9900,
    yearlyPrice: 99900,
    monthlyStripePriceId: "price_1T9X6pCvZwK1QnPVfBlT13Lw",
    yearlyStripePriceId: "price_1T9X6pCvZwK1QnPVfBlT13Ly",
    features: [
      "Profil public complet",
      "Rendez-vous garantis S, M, L",
      "Visibilité améliorée dans la recherche",
      "Badge Pro sur le profil",
      "Support prioritaire",
    ],
    appointmentAccessLevel: "standard",
    priorityLevel: 2,
    matchingBoost: 0.1,
    highlighted: true,
  },
  {
    id: "premium",
    name: "Premium",
    monthlyPrice: 14900,
    yearlyPrice: 149900,
    monthlyStripePriceId: "price_1T9X6qCvZwK1QnPV8V4P18tw",
    yearlyStripePriceId: "price_1T9X6qCvZwK1QnPV8V4P18ty",
    features: [
      "Tout le plan Pro",
      "Rendez-vous garantis S à XL",
      "Auto-acceptation des projets",
      "Statistiques avancées",
      "Badge Premium",
    ],
    appointmentAccessLevel: "priority",
    priorityLevel: 3,
    matchingBoost: 0.2,
  },
  {
    id: "elite",
    name: "Élite",
    monthlyPrice: 24900,
    yearlyPrice: 249900,
    monthlyStripePriceId: "price_1T9X6sCvZwK1QnPV2ZwYQOGT",
    yearlyStripePriceId: "price_1T9X6sCvZwK1QnPV2ZwYQOGY",
    features: [
      "Tout le plan Premium",
      "Tous les rendez-vous garantis (S à XXL)",
      "Auto-acceptation + analytics avancés",
      "Support dédié",
      "Badge Élite",
    ],
    appointmentAccessLevel: "premium",
    priorityLevel: 4,
    matchingBoost: 0.35,
  },
  {
    id: "signature",
    name: "Signature",
    monthlyPrice: 49900,
    yearlyPrice: 499900,
    monthlyStripePriceId: "price_1T9X6tCvZwK1QnPVxNcBNeBM",
    yearlyStripePriceId: "price_1T9X6tCvZwK1QnPVxNcBNeBY",
    features: [
      "Tout le plan Élite",
      "Exclusivité territoriale éligible",
      "Accompagnement personnalisé",
      "Visibilité maximale",
      "Badge Signature",
    ],
    leadAccessLevel: "exclusive",
    priorityLevel: 5,
    matchingBoost: 0.5,
  },
];

export const getPlanById = (planId: string): ContractorPlan | undefined =>
  CONTRACTOR_PLANS.find((p) => p.id === planId);

/** Format cents to display string */
export const formatPlanPrice = (cents: number): string =>
  `${(cents / 100).toFixed(0)} $`;

/** Yearly savings percentage compared to 12× monthly */
export const getYearlySavingsPercent = (plan: ContractorPlan): number => {
  const fullYearly = plan.monthlyPrice * 12;
  if (fullYearly === 0) return 0;
  return Math.round(((fullYearly - plan.yearlyPrice) / fullYearly) * 100);
};

/** Get the correct Stripe price ID for a plan + interval */
export const getStripePriceId = (
  plan: ContractorPlan,
  interval: BillingInterval
): string =>
  interval === "year" ? plan.yearlyStripePriceId : plan.monthlyStripePriceId;

/** Get display price for a plan + interval */
export const getPlanDisplayPrice = (
  plan: ContractorPlan,
  interval: BillingInterval
): number => (interval === "year" ? plan.yearlyPrice : plan.monthlyPrice);

/** Monthly equivalent when billed yearly */
export const getMonthlyEquivalent = (plan: ContractorPlan): string =>
  `${((plan.yearlyPrice / 12) / 100).toFixed(2).replace(/\.00$/, "")} $`;
