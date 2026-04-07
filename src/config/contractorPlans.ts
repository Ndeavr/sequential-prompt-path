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
  tagline: string;
  features: string[];
  appointmentsIncluded: number;
  projectSizes: string[];
  appointmentNotes: string[];
  appointmentAccessLevel: "limited" | "standard" | "priority" | "premium" | "exclusive";
  priorityLevel: number;
  matchingBoost: number;
  highlighted?: boolean;
}

export const CONTRACTOR_PLANS: ContractorPlan[] = [
  {
    id: "recrue",
    name: "Recrue",
    monthlyPrice: 14900,
    yearlyPrice: 149900,
    monthlyStripePriceId: "",
    yearlyStripePriceId: "",
    tagline: "Pour commencer sur UNPRO et recevoir vos premiers rendez-vous.",
    features: [
      "Profil public de base",
      "Score AIPP visible",
      "3 rendez-vous inclus / mois",
      "Accès aux projets XS et S",
      "Support Alex",
    ],
    appointmentsIncluded: 3,
    projectSizes: ["XS", "S"],
    appointmentNotes: [
      "3 rendez-vous inclus / mois",
      "Achat de rendez-vous supplémentaires à la carte",
      "Projets accessibles : XS, S",
    ],
    appointmentAccessLevel: "limited",
    priorityLevel: 1,
    matchingBoost: 0,
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 34900,
    yearlyPrice: 349900,
    monthlyStripePriceId: "price_1T9X6pCvZwK1QnPVfBlT13Lw",
    yearlyStripePriceId: "price_1T9X6pCvZwK1QnPVfBlT13Ly",
    tagline: "Pour établir une présence solide et recevoir des opportunités ciblées.",
    features: [
      "Profil public complet",
      "5 rendez-vous inclus / mois",
      "Visibilité améliorée dans la recherche",
      "Badge Pro",
      "Support Alex prioritaire",
      "Accès aux projets XS à M",
    ],
    appointmentsIncluded: 5,
    projectSizes: ["XS", "S", "M"],
    appointmentNotes: [
      "5 rendez-vous inclus / mois",
      "Achat de rendez-vous supplémentaires à la carte",
      "Projets accessibles : XS, S, M",
    ],
    appointmentAccessLevel: "standard",
    priorityLevel: 2,
    matchingBoost: 0.1,
    highlighted: true,
  },
  {
    id: "premium",
    name: "Premium",
    monthlyPrice: 59900,
    yearlyPrice: 599900,
    monthlyStripePriceId: "price_1T9X6qCvZwK1QnPV8V4P18tw",
    yearlyStripePriceId: "price_1T9X6qCvZwK1QnPV8V4P18ty",
    tagline: "Pour accélérer avec plus d'automatisation et plus de potentiel.",
    features: [
      "Tout le plan Pro",
      "10 rendez-vous inclus / mois",
      "Auto-acceptation des projets",
      "Demandes d'avis automatiques",
      "Statistiques avancées",
      "Badge Premium",
      "Accès aux projets XS à L",
    ],
    appointmentsIncluded: 10,
    projectSizes: ["XS", "S", "M", "L"],
    appointmentNotes: [
      "10 rendez-vous inclus / mois",
      "Achat de rendez-vous supplémentaires à la carte",
      "Projets accessibles : XS, S, M, L",
    ],
    appointmentAccessLevel: "priority",
    priorityLevel: 3,
    matchingBoost: 0.2,
  },
  {
    id: "elite",
    name: "Élite",
    monthlyPrice: 99900,
    yearlyPrice: 999900,
    monthlyStripePriceId: "price_1T9X6sCvZwK1QnPV2ZwYQOGT",
    yearlyStripePriceId: "price_1T9X6sCvZwK1QnPV2ZwYQOGY",
    tagline: "Pour maximiser la capacité, la rapidité et la domination locale.",
    features: [
      "Tout le plan Premium",
      "25 rendez-vous inclus / mois",
      "Support dédié",
      "Analytics avancés",
      "Priorité renforcée dans les recommandations",
      "Accès aux projets XS à XL",
    ],
    appointmentsIncluded: 25,
    projectSizes: ["XS", "S", "M", "L", "XL"],
    appointmentNotes: [
      "25 rendez-vous inclus / mois",
      "Achat de rendez-vous supplémentaires à la carte",
      "Projets accessibles : XS à XL",
    ],
    appointmentAccessLevel: "premium",
    priorityLevel: 4,
    matchingBoost: 0.35,
  },
  {
    id: "signature",
    name: "Signature",
    monthlyPrice: 179900,
    yearlyPrice: 1799900,
    monthlyStripePriceId: "price_1T9X6tCvZwK1QnPVxNcBNeBM",
    yearlyStripePriceId: "price_1T9X6tCvZwK1QnPVxNcBNeBY",
    tagline: "Pour les entreprises qui veulent verrouiller leur position dans leur marché.",
    features: [
      "Visibilité maximale",
      "50 rendez-vous inclus / mois",
      "Badge Signature",
      "Priorité maximale dans les recommandations",
      "Auto-acceptation intelligente",
      "Rapports personnalisés",
      "Potentiel d'exclusivité territoriale",
      "Accès à tous les projets XS à XXL",
    ],
    appointmentsIncluded: 50,
    projectSizes: ["XS", "S", "M", "L", "XL", "XXL"],
    appointmentNotes: [
      "50 rendez-vous inclus / mois",
      "Achat de rendez-vous supplémentaires à la carte",
      "Potentiel d'exclusivité sur certaines combinaisons spécialité + localité",
    ],
    appointmentAccessLevel: "exclusive",
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
  `${((plan.yearlyPrice / 12) / 100).toFixed(0)} $`;
