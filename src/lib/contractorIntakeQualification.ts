/**
 * Qualification déclarée avant tout plan personnalisé :
 * priorités, travaux voulus/exclus, territoires desservis/exclus, capacité.
 * Rien n'est vérifié ni inventé : ce sont des déclarations de l'entrepreneur.
 */
export const INTAKE_PRIORITIES = [
  "Augmenter ma rentabilité",
  "Obtenir de meilleurs mandats",
  "Développer une spécialité",
  "Réduire mes déplacements",
  "Remplir mon calendrier",
  "Stabiliser mes revenus",
] as const;

export type IntakeQualification = {
  priorities?: string[];
  other_goal?: string;
  preferred_work?: string;
  excluded_work?: string;
  /** Choix explicite « Aucune exclusion ». */
  no_excluded_work?: boolean;
  service_areas?: string;
  excluded_areas?: string;
  no_excluded_areas?: boolean;
};

export const splitList = (v?: string | null): string[] =>
  (v ?? "").split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);

export const hasPriorities = (q: IntakeQualification = {}) =>
  (q.priorities?.length ?? 0) > 0 || Boolean(q.other_goal?.trim());
export const hasWork = (q: IntakeQualification = {}) =>
  splitList(q.preferred_work).length > 0 && (q.no_excluded_work || splitList(q.excluded_work).length > 0);
export const hasTerritories = (q: IntakeQualification = {}) =>
  splitList(q.service_areas).length > 0 && (q.no_excluded_areas || splitList(q.excluded_areas).length > 0);

/** Capacité réaliste déclarée (borne basse prudente si plage). */
export function declaredCapacity(g: { capacity_range?: string; next_month_appointments?: number }): { min: number; max: number } | null {
  const ranges: Record<string, { min: number; max: number }> = { "1-9": { min: 1, max: 9 }, "10-15": { min: 10, max: 15 }, "16-20": { min: 16, max: 20 } };
  if (g.capacity_range && ranges[g.capacity_range]) return ranges[g.capacity_range];
  const n = g.next_month_appointments;
  return typeof n === "number" && Number.isFinite(n) && n >= 1 ? { min: n, max: n } : null;
}

export function isQualificationReady(d: { qualification?: IntakeQualification; capacity_range?: string; next_month_appointments?: number }): boolean {
  const q = d.qualification ?? {};
  return hasPriorities(q) && hasWork(q) && hasTerritories(q) && declaredCapacity(d) !== null;
}

/** Préremplit seulement les champs vides : une saisie de l'utilisateur n'est jamais écrasée. */
export function prefillQualification(
  q: IntakeQualification = {},
  known: { goals: string[]; serviceAreas: string[]; preferences?: { work: string[]; excludedWork: string[]; excludedAreas: string[] } },
): IntakeQualification {
  const next = { ...q };
  if (!next.priorities?.length && !next.other_goal && known.goals.length) {
    const std = known.goals.filter((g) => (INTAKE_PRIORITIES as readonly string[]).includes(g));
    const other = known.goals.filter((g) => !std.includes(g));
    next.priorities = std;
    if (other.length) next.other_goal = other.join(", ");
  }
  if (!next.preferred_work && known.preferences?.work.length) next.preferred_work = known.preferences.work.join(", ");
  if (!next.excluded_work && !next.no_excluded_work && known.preferences?.excludedWork.length) next.excluded_work = known.preferences.excludedWork.join(", ");
  if (!next.service_areas && known.serviceAreas.length) next.service_areas = known.serviceAreas.join(", ");
  if (!next.excluded_areas && !next.no_excluded_areas && known.preferences?.excludedAreas.length) next.excluded_areas = known.preferences.excludedAreas.join(", ");
  return next;
}

/** Patch canonique pour saveClaraQualification(…, "declared", { replaceLists: true }). */
export function toClaraPatch(q: IntakeQualification, capacity: { min: number; max: number } | null) {
  return {
    goals: [...(q.priorities ?? []), ...(q.other_goal?.trim() ? [q.other_goal.trim().slice(0, 80)] : [])],
    preferred_work: splitList(q.preferred_work),
    excluded_work: q.no_excluded_work ? [] : splitList(q.excluded_work),
    service_areas: splitList(q.service_areas),
    excluded_areas: q.no_excluded_areas ? [] : splitList(q.excluded_areas),
    availability: capacity ? (capacity.min === capacity.max ? `${capacity.min} rendez-vous le mois prochain` : `${capacity.min} à ${capacity.max} rendez-vous le mois prochain`) : null,
    preferences_captured: true,
    preferences_confirmed: true,
  };
}

/** Contexte joint au devis (input_payload), toujours marqué « déclaré ». */
export function toQuoteContext(q: IntakeQualification, capacity: { min: number; max: number } | null) {
  const p = toClaraPatch(q, capacity);
  return {
    provenance: "declared" as const,
    priorities: p.goals,
    preferred_work: p.preferred_work,
    excluded_work: p.excluded_work,
    no_excluded_work: Boolean(q.no_excluded_work),
    service_areas: p.service_areas,
    excluded_areas: p.excluded_areas,
    no_excluded_areas: Boolean(q.no_excluded_areas),
    capacity_min: capacity?.min ?? null,
    capacity_max: capacity?.max ?? null,
  };
}

/**
 * Objectif qualitatif sans montant : la capacité déclarée détermine l'entente.
 * Aucune vente moyenne, marge ou conversion inventée (0 = inconnu, ROI masqué).
 */
export function qualitativePayload<T extends Record<string, unknown>>(d: T, capacity: { min: number; max: number }) {
  const { capacity_range: _r, margin_other: _m, goal_amount: _a, avg_sale: _s, margin_pct: _p, conversion_pct: _c, ...rest } = d as Record<string, unknown>;
  return {
    ...rest,
    target_monthly_appointments: capacity.min,
    monthly_capacity: Math.max(Number(rest.monthly_capacity ?? 0) || 0, capacity.max),
    average_project_value: 0,
    close_rate_estimate: 0,
    pricing_mode: "goal" as const,
    contract_goal_value: undefined,
    monthly_budget_cents: undefined,
    financial_goal_declared: false,
  };
}
