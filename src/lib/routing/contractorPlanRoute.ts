/**
 * UNPRO — Routage unique des CTA entrepreneur.
 *
 * Toute surface entrepreneur (tableau de bord, score IA, limites, abonnement,
 * relances Clara, liens profonds) doit passer par ce module. Aucune surface ne
 * doit pointer vers `/pricing` (plans Maison) ni vers une grille générique.
 *
 * Aucune donnée inventée ici : ce module ne calcule que des URL.
 */

export const CONTRACTOR_PLAN_ENTRY_ROUTE = "/entrepreneur/plan-personnalise";
export const CONTRACTOR_PLAN_INTAKE_ROUTE = "/entrepreneur/devis-personnalise";
export const HOMEOWNER_PLANS_ROUTE = "/pricing/proprietaires";

/** Objectifs exploitables transmis aux CTA entrepreneur. */
export const CONTRACTOR_OBJECTIVES = [
  "more_appointments",
  "visibility",
  "territory",
  "upgrade",
] as const;

export type ContractorObjective = (typeof CONTRACTOR_OBJECTIVES)[number];

export function isContractorObjective(value: unknown): value is ContractorObjective {
  return typeof value === "string" && (CONTRACTOR_OBJECTIVES as readonly string[]).includes(value);
}

/** Libellés de CTA cohérents — jamais de prix écrit en dur. */
export const CONTRACTOR_OBJECTIVE_CTA: Record<ContractorObjective, string> = {
  more_appointments: "Obtenir plus de rendez-vous",
  visibility: "Améliorer ma visibilité IA",
  territory: "Développer mon territoire",
  upgrade: "Voir mon plan personnalisé",
};

export const CONTRACTOR_PLAN_DEFAULT_CTA = "Voir mon plan personnalisé";

export interface ContractorPlanLinkInput {
  objective?: ContractorObjective | null;
  /** Surface d'origine du clic (ex. `dashboard_upsell`). */
  from?: string | null;
  /** Paramètres additionnels déjà validés (promo, ref, source…). */
  extra?: Record<string, string | null | undefined>;
}

/** URL canonique du tunnel personnalisé, avec contexte exploitable. */
export function contractorPlanLink(input: ContractorPlanLinkInput = {}): string {
  const params = new URLSearchParams();
  if (input.objective && isContractorObjective(input.objective)) {
    params.set("objective", input.objective);
  }
  if (input.from) params.set("from", input.from);
  for (const [key, value] of Object.entries(input.extra ?? {})) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${CONTRACTOR_PLAN_ENTRY_ROUTE}?${qs}` : CONTRACTOR_PLAN_ENTRY_ROUTE;
}

export type PlanAudienceRole = "contractor" | "homeowner" | "admin" | "unknown";

export function normalizePlanAudience(role: string | null | undefined): PlanAudienceRole {
  if (role === "contractor") return "contractor";
  if (role === "homeowner") return "homeowner";
  if (role === "admin") return "admin";
  return "unknown";
}

export interface PlanDestinationInput {
  role: string | null | undefined;
  isAuthenticated: boolean;
  /** Vrai tant que la session ou le rôle ne sont pas résolus. */
  isResolving: boolean;
  objective?: ContractorObjective | null;
  from?: string | null;
}

export type PlanDestination =
  | { kind: "loading" }
  | { kind: "contractor"; href: string }
  | { kind: "homeowner"; href: string }
  /** Non connecté ou rôle inconnu : on garde l'objectif à travers la connexion. */
  | { kind: "contractor_public"; href: string };

/**
 * Destination tarifaire selon le rôle. Tant que le rôle n'est pas résolu,
 * aucune destination tarifaire n'est proposée.
 */
export function resolvePlanDestination(input: PlanDestinationInput): PlanDestination {
  if (input.isResolving) return { kind: "loading" };
  const href = contractorPlanLink({ objective: input.objective, from: input.from });
  const audience = normalizePlanAudience(input.role);
  if (audience === "homeowner") return { kind: "homeowner", href: HOMEOWNER_PLANS_ROUTE };
  if (audience === "contractor" || audience === "admin") return { kind: "contractor", href };
  return { kind: "contractor_public", href };
}

/** URL de connexion qui revient exactement au tunnel demandé. */
export function contractorPlanAuthLink(target: string): string {
  return `/auth?redirect=${encodeURIComponent(target)}`;
}
