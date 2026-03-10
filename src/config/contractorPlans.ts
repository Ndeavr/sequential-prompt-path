/**
 * UNPRO — Contractor Plans Configuration
 */

export interface ContractorPlan {
  id: string;
  name: string;
  monthlyPrice: number; // in cents CAD
  stripePriceId: string;
  features: string[];
  leadAccessLevel: "limited" | "standard" | "priority" | "premium" | "exclusive";
  priorityLevel: number; // 1-5
  matchingBoost: number; // 0-1 multiplier
  highlighted?: boolean;
}

export const CONTRACTOR_PLANS: ContractorPlan[] = [
  {
    id: "recrue",
    name: "Recrue",
    monthlyPrice: 4900,
    stripePriceId: "price_1T9X6oCvZwK1QnPVG3tLbNqV",
    features: [
      "Profil public de base",
      "Jusqu'à 5 leads par mois",
      "Score AIPP visible",
      "Support par courriel",
    ],
    leadAccessLevel: "limited",
    priorityLevel: 1,
    matchingBoost: 0,
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 9900,
    stripePriceId: "price_1T9X6pCvZwK1QnPVfBlT13Lw",
    features: [
      "Profil public complet",
      "Leads illimités",
      "Visibilité améliorée dans la recherche",
      "Badge Pro sur le profil",
      "Support prioritaire",
    ],
    leadAccessLevel: "standard",
    priorityLevel: 2,
    matchingBoost: 0.1,
    highlighted: true,
  },
  {
    id: "premium",
    name: "Premium",
    monthlyPrice: 14900,
    stripePriceId: "price_1T9X6qCvZwK1QnPV8V4P18tw",
    features: [
      "Tout le plan Pro",
      "Priorité dans le matching",
      "Visibilité accrue",
      "Statistiques avancées",
      "Badge Premium",
    ],
    leadAccessLevel: "priority",
    priorityLevel: 3,
    matchingBoost: 0.2,
  },
  {
    id: "elite",
    name: "Élite",
    monthlyPrice: 24900,
    stripePriceId: "price_1T9X6sCvZwK1QnPV2ZwYQOGT",
    features: [
      "Tout le plan Premium",
      "Haute visibilité dans la recherche",
      "Priorité maximale de matching",
      "Support dédié",
      "Badge Élite",
    ],
    leadAccessLevel: "premium",
    priorityLevel: 4,
    matchingBoost: 0.35,
  },
  {
    id: "signature",
    name: "Signature",
    monthlyPrice: 49900,
    stripePriceId: "price_1T9X6tCvZwK1QnPVxNcBNeBM",
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

export const formatPlanPrice = (cents: number): string =>
  `${(cents / 100).toFixed(0)} $`;
