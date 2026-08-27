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
  | "depart"
  | "croissance_v2"
  | "pro_v2"
  | "elite_v2"
  | "signature_v2"
  // superseded slugs kept resolvable for older flows
  | "local"
  | "croissance"
  | "pro"
  | "premium"
  | "domination"
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

/**
 * Canonical entry offer (2026): one-time 350 $ activation pack.
 * « Jusqu'à 5 rendez-vous exclusifs garantis » — the guaranteed number is
 * always computed by the pricing engine before payment, never promised flat.
 * The obsolete « 7 jours à 1 $ » trial is retired and must not reappear.
 */
export const ENTRY_OFFER = {
  priceDollars: 350,
  billingType: "one_time",
  maxAppointments: 5,
  label: "Dès 350 $ — jusqu'à 5 rendez-vous exclusifs garantis",
  note: "Paiement unique. Aucun abonnement. La garantie exacte est calculée avant le paiement.",
} as const;

/** @deprecated Legacy name kept for import compatibility — use ENTRY_OFFER. */
export const TRIAL_OFFER = ENTRY_OFFER;

/**
 * Marketing copy for the ACTIVE catalog in `public.plans` (audience = 'contractor').
 * Prices mirror the DB rows exactly — the DB stays the source of truth.
 */
export const CONTRACTOR_PLANS: ContractorPlan[] = [
  {
    slug: "depart",
    name: "Départ",
    monthlyPrice: 149,
    subtitle: "Votre premier rendez-vous chaque mois",
    description:
      "Un rendez-vous exclusif garanti par mois, jamais partagé avec un autre entrepreneur.",
    cta: "Activer Départ",
    featured: false,
    appointmentsIncluded: 1,
    features: [
      "1 rendez-vous exclusif garanti par mois",
      "Profil UNPRO vérifié",
      "Visibilité locale dans votre ville",
      "Aucun lead partagé",
    ],
  },
  {
    slug: "croissance_v2",
    name: "Croissance",
    monthlyPrice: 299,
    subtitle: "Un flux régulier de projets",
    description:
      "Trois rendez-vous exclusifs garantis par mois et des statistiques pour piloter votre croissance.",
    cta: "Activer Croissance",
    featured: false,
    appointmentsIncluded: 3,
    features: [
      "3 rendez-vous exclusifs garantis par mois",
      "Demandes qualifiées par Alex",
      "Statistiques de performance",
      "Optimisation continue du profil (AIPP)",
    ],
  },
  {
    slug: "pro_v2",
    name: "Pro",
    monthlyPrice: 599,
    subtitle: "Votre agenda se remplit",
    eyebrow: "Plan le plus populaire",
    description:
      "Sept rendez-vous exclusifs garantis par mois, confirmés directement à votre agenda.",
    cta: "Activer Pro",
    featured: true,
    appointmentsIncluded: 7,
    features: [
      "7 rendez-vous exclusifs garantis par mois",
      "Rendez-vous directs à l'agenda",
      "Synchronisation calendrier",
      "Priorité de répartition dans votre secteur",
      "Notifications instantanées",
    ],
  },
  {
    slug: "elite_v2",
    name: "Élite",
    monthlyPrice: 999,
    subtitle: "Volume élevé, agenda optimisé",
    description:
      "Douze rendez-vous exclusifs garantis par mois avec optimisation des routes et des distances.",
    cta: "Activer Élite",
    featured: false,
    appointmentsIncluded: 12,
    features: [
      "12 rendez-vous exclusifs garantis par mois",
      "Tout le plan Pro",
      "Optimisation des routes et distances",
      "Buffers automatiques entre les rendez-vous",
      "Support prioritaire",
    ],
  },
  {
    slug: "signature_v2",
    name: "Signature",
    monthlyPrice: 1499,
    subtitle: "Vous contrôlez votre marché",
    description:
      "Capacité sur mesure et exclusivité territoriale, orchestrées par l'intelligence UNPRO.",
    cta: "Parler à UNPRO",
    featured: false,
    appointmentsIncluded: 0,
    features: [
      "Capacité de rendez-vous sur mesure",
      "Exclusivité de territoire",
      "Regroupement intelligent par secteur",
      "Priorisation des projets à haute valeur",
      "Visibilité IA maximale (AIPP MAX)",
    ],
  },
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
  local: "depart",
  croissance: "croissance_v2",
  pro: "pro_v2",
  premium: "elite_v2",
  elite: "elite_v2",
  domination: "signature_v2",
  signature: "signature_v2",
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
  return "pro_v2";
}

/**
 * Price lookup map for calculators.
 * DERIVED from CONTRACTOR_PLANS + LEGACY_PLAN_ALIAS so a legacy slug can never
 * report a different price than the canonical plan it resolves to.
 */
export const PLAN_PRICE_MAP: Record<ContractorPlanSlug, number> = Object.freeze(
  Object.fromEntries([
    ...CONTRACTOR_PLANS.map((p) => [p.slug, p.monthlyPrice]),
    ...Object.entries(LEGACY_PLAN_ALIAS).map(([legacy, canonical]) => [
      legacy,
      CONTRACTOR_PLANS.find((p) => p.slug === canonical)?.monthlyPrice ?? 0,
    ]),
  ]),
) as Record<ContractorPlanSlug, number>;

/** Format dollars to display string (fr-CA, e.g. "1 300 $"). */
import { formatPrice as fmt } from "@/lib/formatPrice";
export const formatPrice = (dollars: number): string => fmt(dollars);
