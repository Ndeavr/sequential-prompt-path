/**
 * UNPRO — Contractor Plans: Single Source of Truth (v2026.09-canonical)
 *
 * PUBLIC CATALOG (CAD, taxes en sus, facturées au paiement) :
 *   Recrue 0 (gratuit, jamais de paiement)
 *   Départ 149 / 1 430 an
 *   Croissance 299 / 2 870 an
 *   Pro 599 / 5 750 an
 *   Élite 999 / 9 590 an
 *
 * Le prix annuel = 20 % de rabais sur 12 mois, arrondi au dollar inférieur.
 * Aucune autre règle de rabais (15 %, 16,7 %, ×10 mois) n'est permise.
 *
 * Présence et Signature sont RETIRÉS de l'offre publique : conservés ici et en
 * base pour les abonnés existants, jamais souscriptibles.
 *
 * Prices mirror public.plans (audience = 'contractor'). Use `usePlanCatalog()`
 * when live DB values are required; this file is the static fallback + copy source.
 */

export type ContractorPlanSlug =
  | "recrue"
  | "depart"
  | "croissance_v2"
  | "pro_v2"
  | "elite_v2"
  // retired / superseded slugs kept resolvable for existing subscribers & older flows
  | "presence"
  | "signature_v2"
  | "local"
  | "croissance"
  | "pro"
  | "premium"
  | "domination"
  | "elite"
  | "signature";

export type BillingInterval = "month" | "year";

export interface ContractorPlan {
  slug: ContractorPlanSlug;
  name: string;
  monthlyPrice: number; // dollars CAD
  /** Annual total in dollars CAD (0 for the free plan). */
  yearlyPrice: number;
  subtitle: string;
  description: string;
  cta: string;
  featured: boolean;
  eyebrow?: string;
  appointmentsIncluded: number;
  features: string[];
  /** Free plan: activation immediate, never goes through checkout. */
  free?: boolean;
  /** Retired from the public catalog — existing subscribers keep it. */
  retired?: boolean;
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

/** THE ONLY annual rule: 20 % off 12 months, floored to the dollar. */
export const YEARLY_DISCOUNT_RATE = 0.2;
export const computeYearlyPrice = (monthlyDollars: number): number =>
  Math.floor(monthlyDollars * 12 * (1 - YEARLY_DISCOUNT_RATE));

/** @deprecated Historical campaign compatibility only. Never use as a default entry path. */
export const ENTRY_OFFER = {
  priceDollars: 350,
  billingType: "one_time",
  maxAppointments: 5,
  label: "Campagne historique — accès restreint",
  note: "Non offert dans le parcours entrepreneur courant.",
} as const;

/** @deprecated Legacy name kept for import compatibility — use ENTRY_OFFER. */
export const TRIAL_OFFER = ENTRY_OFFER;

/** The 5 plans offered publicly today. */
export const PUBLIC_CONTRACTOR_PLANS: ContractorPlan[] = [
  {
    slug: "recrue",
    name: "Recrue",
    monthlyPrice: 0,
    yearlyPrice: 0,
    free: true,
    subtitle: "Votre entreprise existe dans UNPRO",
    description:
      "Activation gratuite : votre profil vérifié devient visible dans l'intelligence UNPRO.",
    cta: "Activer gratuitement",
    featured: false,
    appointmentsIncluded: 0,
    features: [
      "Profil UNPRO vérifié",
      "Présence dans les réponses IA",
      "Score de visibilité visible",
      "Aucun paiement requis",
    ],
  },
  {
    slug: "depart",
    name: "Départ",
    monthlyPrice: 149,
    yearlyPrice: 1430,
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
    yearlyPrice: 2870,
    subtitle: "Un flux régulier de projets",
    description:
      "Trois rendez-vous exclusifs garantis par mois et des statistiques pour piloter votre croissance.",
    cta: "Activer Croissance",
    featured: false,
    appointmentsIncluded: 3,
    features: [
      "3 rendez-vous exclusifs garantis par mois",
      "Demandes qualifiées par Clara",
      "Statistiques de performance",
      "Optimisation continue du profil",
    ],
  },
  {
    slug: "pro_v2",
    name: "Pro",
    monthlyPrice: 599,
    yearlyPrice: 5750,
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
    yearlyPrice: 9590,
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
];

/**
 * Retired plans. Kept resolvable so existing subscribers keep a correct label
 * and price. NEVER rendered in a public grid, NEVER subscribable.
 */
export const RETIRED_CONTRACTOR_PLANS: ContractorPlan[] = [
  {
    slug: "presence",
    name: "Présence",
    monthlyPrice: 49,
    yearlyPrice: 490,
    retired: true,
    subtitle: "Forfait retiré de l'offre",
    description: "Forfait historique conservé pour les abonnés existants.",
    cta: "Choisir un forfait actuel",
    featured: false,
    appointmentsIncluded: 0,
    features: ["Profil UNPRO vérifié", "Présence dans les réponses IA"],
  },
  {
    slug: "signature_v2",
    name: "Signature",
    monthlyPrice: 1499,
    yearlyPrice: 14390,
    retired: true,
    subtitle: "Forfait retiré de l'offre",
    description: "Forfait historique conservé pour les abonnés existants.",
    cta: "Choisir un forfait actuel",
    featured: false,
    appointmentsIncluded: 0,
    features: ["Capacité sur mesure", "Exclusivité de territoire"],
  },
  {
    slug: "local",
    name: "Local",
    monthlyPrice: 79,
    yearlyPrice: 758,
    retired: true,
    subtitle: "Forfait retiré de l'offre",
    description: "Forfait historique conservé pour les abonnés existants.",
    cta: "Choisir un forfait actuel",
    featured: false,
    appointmentsIncluded: 2,
    features: ["2 rendez-vous inclus"],
  },
  {
    slug: "croissance",
    name: "Croissance",
    monthlyPrice: 149,
    yearlyPrice: 1430,
    retired: true,
    subtitle: "Forfait retiré de l'offre",
    description: "Forfait historique conservé pour les abonnés existants.",
    cta: "Choisir un forfait actuel",
    featured: false,
    appointmentsIncluded: 5,
    features: ["5 rendez-vous inclus"],
  },
  {
    slug: "pro",
    name: "Pro",
    monthlyPrice: 299,
    yearlyPrice: 2870,
    retired: true,
    subtitle: "Forfait retiré de l'offre",
    description: "Forfait historique conservé pour les abonnés existants.",
    cta: "Choisir un forfait actuel",
    featured: false,
    appointmentsIncluded: 12,
    features: ["12 rendez-vous inclus"],
  },
  {
    slug: "premium",
    name: "Premium",
    monthlyPrice: 599,
    yearlyPrice: 5750,
    retired: true,
    subtitle: "Forfait retiré de l'offre",
    description: "Forfait historique conservé pour les abonnés existants.",
    cta: "Choisir un forfait actuel",
    featured: false,
    appointmentsIncluded: 25,
    features: ["25 rendez-vous inclus"],
  },
  {
    slug: "domination",
    name: "Domination",
    monthlyPrice: 1499,
    yearlyPrice: 14390,
    retired: true,
    subtitle: "Forfait retiré de l'offre",
    description: "Forfait historique conservé pour les abonnés existants.",
    cta: "Choisir un forfait actuel",
    featured: false,
    appointmentsIncluded: 60,
    features: ["60 rendez-vous inclus"],
  },
];

/** Every known plan (public first). Use PUBLIC_CONTRACTOR_PLANS to render a grid. */
export const CONTRACTOR_PLANS: ContractorPlan[] = [
  ...PUBLIC_CONTRACTOR_PLANS,
  ...RETIRED_CONTRACTOR_PLANS,
];

/** Free entry plan — activated instantly, never sent to checkout. */
export const FREE_PLAN_SLUG: ContractorPlanSlug = "recrue";

/** The only plans a NEW subscription can be created for. */
export const SUBSCRIBABLE_PLAN_SLUGS: readonly ContractorPlanSlug[] = Object.freeze([
  "depart",
  "croissance_v2",
  "pro_v2",
  "elite_v2",
]);

/** Retired plan codes — no new subscription may ever be created for these. */
export const RETIRED_PLAN_SLUGS: readonly ContractorPlanSlug[] = Object.freeze(
  RETIRED_CONTRACTOR_PLANS.map((p) => p.slug),
);

export const isFreePlanSlug = (slug: string | null | undefined): boolean =>
  (slug ?? "").toLowerCase() === FREE_PLAN_SLUG;

export const isRetiredPlanSlug = (slug: string | null | undefined): boolean =>
  !!slug && (RETIRED_PLAN_SLUGS as readonly string[]).includes(slug.toLowerCase());

export const isSubscribablePlanSlug = (slug: string | null | undefined): boolean =>
  !!slug && (SUBSCRIBABLE_PLAN_SLUGS as readonly string[]).includes(slug.toLowerCase());

/**
 * Legacy slug → currently offered slug.
 * NOTE: retired plans (presence / signature_v2) are intentionally NOT aliased —
 * an existing subscriber must keep seeing their real plan name and price.
 */
export const LEGACY_PLAN_ALIAS: Record<string, ContractorPlanSlug> = {
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
  const direct = CONTRACTOR_PLANS.find((p) => p.slug === slug);
  if (direct) return direct;
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
 * report a different price than the plan it resolves to.
 */
export const PLAN_PRICE_MAP: Record<ContractorPlanSlug, number> = Object.freeze(
  Object.fromEntries([
    // Alias entries first so a slug that also exists as a real row keeps its own price.
    ...Object.entries(LEGACY_PLAN_ALIAS).map(([legacy, canonical]) => [
      legacy,
      CONTRACTOR_PLANS.find((p) => p.slug === canonical)?.monthlyPrice ?? 0,
    ]),
    ...CONTRACTOR_PLANS.map((p) => [p.slug, p.monthlyPrice]),
  ]),
) as Record<ContractorPlanSlug, number>;

/** Format dollars to display string (fr-CA, e.g. "1 300 $"). */
import { formatPrice as fmt } from "@/lib/formatPrice";
export const formatPrice = (dollars: number): string => fmt(dollars);
