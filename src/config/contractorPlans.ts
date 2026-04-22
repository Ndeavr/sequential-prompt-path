/**
 * UNPRO — Contractor Plans: Single Source of Truth
 * All contractor pricing flows MUST import from this file.
 * No hardcoded prices anywhere else.
 *
 * Standard plans: Recrue=149, Pro=349, Premium=599, Élite=999, Signature=1799
 * Founder offers: Élite Fondateur=19995, Signature Fondateur=29995 (one-time)
 */

export type ContractorPlanSlug = "recrue" | "pro" | "premium" | "elite" | "signature";
export type BillingInterval = "month" | "year";

export interface ContractorPlan {
  slug: ContractorPlanSlug;
  name: string;
  monthlyPrice: number; // dollars CAD
  subtitle: string;
  description: string;
  cta: string;
  featured: boolean;
  eyebrow?: string;
  appointmentsIncluded: number;
  features: string[];
}

export interface FounderOffer {
  slug: string;
  name: string;
  basePlanSlug: ContractorPlanSlug;
  priceOneTime: number; // dollars CAD
  termYears: number;
  billingType: "one_time";
  inventoryLimited: boolean;
  description: string;
  cta: string;
}

export const CONTRACTOR_PLANS: ContractorPlan[] = [
  {
    slug: "recrue",
    name: "Recrue",
    monthlyPrice: 149,
    subtitle: "Vous existez",
    description: "Présence de base dans l'écosystème UNPRO pour démarrer proprement avec une présence crédible.",
    cta: "Activer Recrue",
    featured: false,
    appointmentsIncluded: 0,
    features: [
      "Profil UNPRO",
      "Présence dans l'écosystème IA",
      "Réception de demandes de base",
    ],
  },
  {
    slug: "pro",
    name: "Pro",
    monthlyPrice: 349,
    subtitle: "Vous recevez des opportunités",
    description: "Vous entrez dans le système avec des demandes qualifiées et une meilleure visibilité.",
    cta: "Activer Pro",
    featured: false,
    appointmentsIncluded: 5,
    features: [
      "5 rendez-vous inclus",
      "Demandes qualifiées",
      "Profil optimisé (AIPP)",
      "Statistiques de base",
    ],
  },
  {
    slug: "premium",
    name: "Premium",
    monthlyPrice: 599,
    subtitle: "Votre agenda commence à se remplir",
    eyebrow: "Plan le plus populaire",
    description: "Des rendez-vous confirmés arrivent directement dans votre calendrier selon vos disponibilités.",
    cta: "Passer à Premium",
    featured: true,
    appointmentsIncluded: 10,
    features: [
      "10 rendez-vous inclus",
      "Rendez-vous directs à l'agenda",
      "Synchronisation Google Calendar",
      "Gestion des disponibilités",
      "Notifications instantanées",
    ],
  },
  {
    slug: "elite",
    name: "Élite",
    monthlyPrice: 999,
    subtitle: "Votre agenda devient optimisé",
    description: "UNPRO protège votre temps avec l'optimisation des routes, des distances et des buffers.",
    cta: "Activer Élite",
    featured: false,
    appointmentsIncluded: 25,
    features: [
      "25 rendez-vous inclus",
      "Tout Premium",
      "Optimisation des routes",
      "Calcul de distance entre chaque rendez-vous",
      "Buffers automatiques entre déplacements",
      "Priorité sur les plages rentables",
    ],
  },
  {
    slug: "signature",
    name: "Signature",
    monthlyPrice: 1799,
    subtitle: "Vous contrôlez votre marché",
    description: "Orchestration IA complète de l'agenda et du territoire pour maximiser chaque journée.",
    cta: "Activer Signature",
    featured: false,
    appointmentsIncluded: 50,
    features: [
      "50 rendez-vous inclus",
      "Tout Élite",
      "Optimisation avancée en temps réel",
      "Regroupement intelligent par secteur",
      "Priorisation des rendez-vous à haute valeur",
      "Accès exclusif / limité par territoire",
      "Visibilité maximale IA (AIPP MAX)",
    ],
  },
];

export const FOUNDER_OFFERS: FounderOffer[] = [
  {
    slug: "elite-founder",
    name: "Élite Fondateur",
    basePlanSlug: "elite",
    priceOneTime: 19995,
    termYears: 10,
    billingType: "one_time",
    inventoryLimited: true,
    description: "Accès Fondateur Élite verrouillé pour 10 ans.",
    cta: "Réserver Élite Fondateur",
  },
  {
    slug: "signature-founder",
    name: "Signature Fondateur",
    basePlanSlug: "signature",
    priceOneTime: 29995,
    termYears: 10,
    billingType: "one_time",
    inventoryLimited: true,
    description: "Accès Fondateur Signature verrouillé pour 10 ans.",
    cta: "Réserver Signature Fondateur",
  },
];

/** Lookup a contractor plan by slug */
export function getContractorPlan(slug: string): ContractorPlan | undefined {
  return CONTRACTOR_PLANS.find((p) => p.slug === slug);
}

/** Get the recommended plan slug */
export function getRecommendedPlanSlug(): ContractorPlanSlug {
  return "premium";
}

/** Price lookup map for calculators */
export const PLAN_PRICE_MAP: Record<ContractorPlanSlug, number> = {
  recrue: 149,
  pro: 349,
  premium: 599,
  elite: 999,
  signature: 1799,
};

/** Format dollars to display string */
export const formatPrice = (dollars: number): string => `${dollars} $`;
