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
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyStripePriceId: "",
    yearlyStripePriceId: "",
    tagline: "Pour commencer sur UNPRO sans engagement mensuel.",
    features: [
      "Profil public de base",
      "Score AIPP visible",
      "Accès aux projets S et M",
      "Support Alex",
    ],
    appointmentsIncluded: 0,
    projectSizes: ["S", "M"],
    appointmentNotes: [
      "Aucun rendez-vous inclus",
      "Achat de rendez-vous supplémentaires à la carte",
      "Achat possible à l'unité ou en bloc",
      "Accès selon disponibilité dans votre spécialité et votre localité",
    ],
    appointmentAccessLevel: "limited",
    priorityLevel: 1,
    matchingBoost: 0,
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 4900,
    yearlyPrice: 49900,
    monthlyStripePriceId: "price_1T9X6pCvZwK1QnPVfBlT13Lw",
    yearlyStripePriceId: "price_1T9X6pCvZwK1QnPVfBlT13Ly",
    tagline: "Pour établir une présence solide et recevoir des opportunités ciblées.",
    features: [
      "Profil public complet",
      "Visibilité améliorée dans la recherche",
      "Badge Pro",
      "Support Alex prioritaire",
      "Accès aux projets S, M et L",
    ],
    appointmentsIncluded: 1,
    projectSizes: ["S", "M", "L"],
    appointmentNotes: [
      "1 rendez-vous inclus / mois",
      "Achat de rendez-vous supplémentaires à la carte",
      "Achat possible à l'unité ou en bloc",
      "Projets accessibles : S, M, L",
      "Accès selon disponibilité dans votre spécialité et votre localité",
    ],
    appointmentAccessLevel: "standard",
    priorityLevel: 2,
    matchingBoost: 0.1,
    highlighted: true,
  },
  {
    id: "premium",
    name: "Premium",
    monthlyPrice: 9900,
    yearlyPrice: 99900,
    monthlyStripePriceId: "price_1T9X6qCvZwK1QnPV8V4P18tw",
    yearlyStripePriceId: "price_1T9X6qCvZwK1QnPV8V4P18ty",
    tagline: "Pour accélérer avec plus d'automatisation et plus de potentiel.",
    features: [
      "Tout le plan Pro",
      "Auto-acceptation des projets",
      "Demandes d'avis automatiques après rendez-vous",
      "Statistiques avancées",
      "Badge Premium",
      "Accès aux projets S à XL",
    ],
    appointmentsIncluded: 2,
    projectSizes: ["S", "M", "L", "XL"],
    appointmentNotes: [
      "2 rendez-vous inclus / mois",
      "Achat de rendez-vous supplémentaires à la carte",
      "Achat possible à l'unité ou en bloc",
      "Projets accessibles : S, M, L, XL",
      "Accès selon disponibilité dans votre spécialité et votre localité",
    ],
    appointmentAccessLevel: "priority",
    priorityLevel: 3,
    matchingBoost: 0.2,
  },
  {
    id: "elite",
    name: "Élite",
    monthlyPrice: 19900,
    yearlyPrice: 199900,
    monthlyStripePriceId: "price_1T9X6sCvZwK1QnPV2ZwYQOGT",
    yearlyStripePriceId: "price_1T9X6sCvZwK1QnPV2ZwYQOGY",
    tagline: "Pour maximiser la capacité, la rapidité et la domination locale.",
    features: [
      "Tout le plan Premium",
      "Support dédié",
      "Analytics avancés",
      "Priorité renforcée dans les recommandations",
      "Accès aux projets S à XXL",
    ],
    appointmentsIncluded: 4,
    projectSizes: ["S", "M", "L", "XL", "XXL"],
    appointmentNotes: [
      "4 rendez-vous inclus / mois",
      "Achat de rendez-vous supplémentaires à la carte",
      "Achat possible à l'unité ou en bloc",
      "Projets accessibles : S, M, L, XL, XXL",
      "Accès selon disponibilité dans votre spécialité et votre localité",
    ],
    appointmentAccessLevel: "premium",
    priorityLevel: 4,
    matchingBoost: 0.35,
  },
  {
    id: "signature",
    name: "Signature",
    monthlyPrice: 39900,
    yearlyPrice: 399900,
    monthlyStripePriceId: "price_1T9X6tCvZwK1QnPVxNcBNeBM",
    yearlyStripePriceId: "price_1T9X6tCvZwK1QnPVxNcBNeBY",
    tagline: "Pour les entreprises qui veulent verrouiller leur position dans leur marché.",
    features: [
      "Visibilité maximale",
      "Badge Signature",
      "Priorité maximale dans les recommandations",
      "Auto-acceptation intelligente",
      "Rapports personnalisés",
      "Potentiel d'exclusivité territoriale",
      "Accès à tous les projets S à XXL",
    ],
    appointmentsIncluded: 8,
    projectSizes: ["S", "M", "L", "XL", "XXL"],
    appointmentNotes: [
      "8 rendez-vous inclus / mois",
      "Achat de rendez-vous supplémentaires à la carte",
      "Achat possible à l'unité ou en bloc",
      "Priorité sur certaines localités et classes stratégiques",
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
