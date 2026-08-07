/**
 * UNPRO — Contractor Plans: Single Source of Truth (v2026.08-growth)
 *
 * Canonical catalog (monthly, CAD):
 *   Présence 49 · Local 79 · Croissance 149 · Pro 299 · Premium 599 · Domination 1499
 *
 * Prices mirror public.plans (audience = 'contractor'). Use `useContractorPlans()`
 * when live DB values are required; this file is the static fallback + type source.
 * Legacy slugs (recrue, elite, signature) remain resolvable through LEGACY_PLAN_ALIAS.
 */

export type ContractorPlanSlug =
  | "presence"
  | "local"
  | "croissance"
  | "pro"
  | "premium"
  | "domination"
  // legacy slugs kept resolvable for older flows
  | "recrue"
  | "elite"
  | "signature";

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

/** $1 entry offer applied to every plan. */
export const TRIAL_OFFER = {
  priceDollars: 1,
  days: 7,
  label: "1 $ pour 7 jours",
  note: "Puis votre plan mensuel. Annulable en tout temps.",
} as const;

export const CONTRACTOR_PLANS: ContractorPlan[] = [
  {
    slug: "presence",
    name: "Présence",
    monthlyPrice: 49,
    subtitle: "Vous existez dans l'écosystème",
    description:
      "Votre entreprise devient visible et vérifiable dans l'intelligence UNPRO.",
    cta: "Activer Présence",
    featured: false,
    appointmentsIncluded: 0,
    features: [
      "Profil UNPRO vérifié",
      "Présence dans les réponses IA",
      "Réception de demandes de base",
    ],
  },
  {
    slug: "local",
    name: "Local",
    monthlyPrice: 79,
    subtitle: "Vos premiers rendez-vous",
    description:
      "Visibilité locale prioritaire dans votre ville et vos premiers rendez-vous confirmés.",
    cta: "Activer Local",
    featured: false,
    appointmentsIncluded: 2,
    features: [
      "2 rendez-vous inclus",
      "Priorité locale dans votre ville",
      "Profil optimisé (AIPP)",
    ],
  },
  {
    slug: "croissance",
    name: "Croissance",
    monthlyPrice: 149,
    subtitle: "Quelques projets de plus chaque mois",
    description:
      "Un flux régulier de rendez-vous qualifiés et des statistiques pour piloter votre croissance.",
    cta: "Activer Croissance",
    featured: false,
    appointmentsIncluded: 5,
    features: [
      "5 rendez-vous inclus",
      "Demandes qualifiées",
      "Statistiques avancées",
      "Optimisation AIPP continue",
    ],
  },
  {
    slug: "pro",
    name: "Pro",
    monthlyPrice: 299,
    subtitle: "Votre agenda se remplit",
    eyebrow: "Plan le plus populaire",
    description:
      "Rendez-vous confirmés directement à l'agenda, priorité de répartition dans votre secteur.",
    cta: "Activer Pro",
    featured: true,
    appointmentsIncluded: 12,
    features: [
      "12 rendez-vous inclus",
      "Rendez-vous directs à l'agenda",
      "Synchronisation calendrier",
      "Priorité de répartition",
      "Notifications instantanées",
    ],
  },
  {
    slug: "premium",
    name: "Premium",
    monthlyPrice: 599,
    subtitle: "Volume élevé, agenda optimisé",
    description:
      "Optimisation des routes, des distances et des buffers pour protéger chaque journée.",
    cta: "Activer Premium",
    featured: false,
    appointmentsIncluded: 25,
    features: [
      "25 rendez-vous inclus",
      "Tout Pro",
      "Optimisation des routes et distances",
      "Buffers automatiques",
      "Support prioritaire",
    ],
  },
  {
    slug: "domination",
    name: "Domination",
    monthlyPrice: 1499,
    subtitle: "Vous contrôlez votre marché",
    description:
      "Exclusivité de territoire et orchestration IA complète de votre agenda et de votre visibilité.",
    cta: "Activer Domination",
    featured: false,
    appointmentsIncluded: 60,
    features: [
      "60 rendez-vous inclus",
      "Tout Premium",
      "Exclusivité de territoire",
      "Regroupement intelligent par secteur",
      "Priorisation des projets à haute valeur",
      "Visibilité IA maximale (AIPP MAX)",
    ],
  },
];

/** Legacy slug → canonical slug. Keeps older flows working after the refactor. */
export const LEGACY_PLAN_ALIAS: Record<string, ContractorPlanSlug> = {
  recrue: "presence",
  elite: "premium",
  signature: "domination",
};

export function resolvePlanSlug(slug: string): ContractorPlanSlug {
  return (LEGACY_PLAN_ALIAS[slug] ?? slug) as ContractorPlanSlug;
}

export const FOUNDER_OFFERS: FounderOffer[] = [
  {
    slug: "premium-founder",
    name: "Premium Fondateur",
    basePlanSlug: "premium",
    priceOneTime: 19995,
    termYears: 10,
    billingType: "one_time",
    inventoryLimited: true,
    description: "Accès Fondateur Premium verrouillé pour 10 ans.",
    cta: "Réserver Premium Fondateur",
  },
  {
    slug: "domination-founder",
    name: "Domination Fondateur",
    basePlanSlug: "domination",
    priceOneTime: 29995,
    termYears: 10,
    billingType: "one_time",
    inventoryLimited: true,
    description: "Accès Fondateur Domination verrouillé pour 10 ans.",
    cta: "Réserver Domination Fondateur",
  },
];

/** Lookup a contractor plan by slug (legacy slugs resolve to their replacement). */
export function getContractorPlan(slug: string): ContractorPlan | undefined {
  const canonical = resolvePlanSlug(slug);
  return CONTRACTOR_PLANS.find((p) => p.slug === canonical);
}

/** Get the recommended plan slug */
export function getRecommendedPlanSlug(): ContractorPlanSlug {
  return "pro";
}

/** Price lookup map for calculators (legacy keys aliased to the new prices). */
export const PLAN_PRICE_MAP: Record<ContractorPlanSlug, number> = {
  presence: 49,
  local: 79,
  croissance: 149,
  pro: 299,
  premium: 599,
  domination: 1499,
  // legacy aliases
  recrue: 49,
  elite: 599,
  signature: 1499,
};

/** Format dollars to display string (fr-CA, e.g. "1 300 $"). */
import { formatPrice as fmt } from "@/lib/formatPrice";
export const formatPrice = (dollars: number): string => fmt(dollars);
