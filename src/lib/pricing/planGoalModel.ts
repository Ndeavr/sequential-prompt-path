/**
 * UNPRO — Modèle d'objectif du plan personnalisé (pur, auditable).
 *
 * Unités explicites :
 * - capacité et rendez-vous = RENDEZ-VOUS PAR MOIS (rencontres client), jamais
 *   des contrats ni des chantiers;
 * - contrats = rendez-vous × conversion;
 * - valeur commerciale attendue d'un rendez-vous = panier × conversion
 *   (× marge pour le profit). Ce n'est PAS le tarif UNPRO d'un rendez-vous,
 *   qui reste fixé par le serveur.
 *
 * Tout est une hypothèse déclarée ou modifiable : aucun revenu n'est promis.
 */

export type GoalKind = "sales" | "profit";
export type ProjectSizeCode = "small" | "medium" | "large";
export type SizeStance = "sought" | "accepted" | "refused";

/**
 * Entrée de répartition par taille. UNITÉ : `sharePct` = part des RENDEZ-VOUS
 * (pas des contrats). Toutes les valeurs sont celles de l'entrepreneur
 * (hypothèses modifiables) : aucune fourchette universelle n'est imposée.
 */
export interface ProjectSizeEntry {
  code: ProjectSizeCode;
  /** Valeur moyenne d'un contrat gagné de cette taille (CAD HT). */
  basket?: number | null;
  /** Part déclarée des rendez-vous (%). */
  sharePct?: number | null;
  /** Conversion rendez-vous → contrat propre à cette taille (%). */
  conversionPct?: number | null;
  /** Fourchette de valeur d'un projet de cette taille, déclarée (CAD HT). */
  minValue?: number | null;
  maxValue?: number | null;
  stance?: SizeStance;
}

/** Unité de la répartition déclarée : part des rendez-vous. */
export const SIZE_MIX_SHARE_UNIT = "appointments" as const;

export interface GoalInputs {
  kind: GoalKind;
  /** Objectif supplémentaire (CAD HT) sur l'horizon. */
  amount: number | null;
  horizonMonths: number;
  /** Panier moyen global (utilisé sans répartition déclarée). */
  basket: number | null;
  conversionPct: number | null;
  marginPct: number | null;
  /** Capacité déclarée, en rendez-vous par mois. */
  capacityPerMonth: number | null;
  /** Rendez-vous par mois choisis (curseur / saisie). */
  appointmentsPerMonth: number | null;
  sizes?: ProjectSizeEntry[];
}

export type GoalError =
  | "invalid_amount"
  | "invalid_horizon"
  | "invalid_basket"
  | "invalid_conversion"
  | "missing_margin"
  | "invalid_margin"
  | "invalid_capacity"
  | "invalid_appointments"
  | "invalid_size_mix"
  | "invalid_size_share"
  | "invalid_size_basket"
  | "invalid_size_conversion"
  | "invalid_size_range"
  | "size_mix_total";

export const SIZE_LABELS: Record<"fr" | "en", Record<ProjectSizeCode, string>> = {
  fr: { small: "Petits projets", medium: "Projets moyens", large: "Grands projets" },
  en: { small: "Small projects", medium: "Medium projects", large: "Large projects" },
};

const pos = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;

/** Tailles actives (non refusées) pour lesquelles une valeur économique a été saisie. */
export function activeMix(sizes: ProjectSizeEntry[] | undefined): ProjectSizeEntry[] {
  return (sizes ?? []).filter((s) => s.stance !== "refused" && [s.sharePct, s.basket, s.conversionPct].some((v) => v !== null && v !== undefined));
}

/** Erreurs de répartition : chaque taille active est validée, jamais masquée par une moyenne. */
export function validateSizeMix(sizes: ProjectSizeEntry[] | undefined): GoalError[] {
  const errors = new Set<GoalError>();
  for (const s of sizes ?? []) {
    const hasRange = (s.minValue ?? null) !== null || (s.maxValue ?? null) !== null;
    if (hasRange) {
      const lo = s.minValue ?? null, hi = s.maxValue ?? null;
      if ((lo !== null && !(Number.isFinite(lo) && lo >= 0)) || (hi !== null && !(Number.isFinite(hi) && hi > 0)) || (lo !== null && hi !== null && lo >= hi)) errors.add("invalid_size_range");
    }
  }
  const mix = activeMix(sizes);
  if (!mix.length) return [...errors];
  for (const s of mix) {
    if (!(pos(s.sharePct) && (s.sharePct as number) <= 100)) errors.add("invalid_size_share");
    if (!pos(s.basket)) errors.add("invalid_size_basket");
    if (!(pos(s.conversionPct) && (s.conversionPct as number) <= 100)) errors.add("invalid_size_conversion");
  }
  if (!errors.has("invalid_size_share")) {
    const total = mix.reduce((a, s) => a + (s.sharePct as number), 0);
    if (Math.abs(total - 100) > 0.01) errors.add("size_mix_total");
  }
  return [...errors];
}

/** Somme des parts actives (%), pour l'affichage et la normalisation explicite. */
export function sizeMixTotal(sizes: ProjectSizeEntry[] | undefined): number {
  return activeMix(sizes).reduce((a, s) => a + (pos(s.sharePct) ? (s.sharePct as number) : 0), 0);
}

/** Normalisation DEMANDÉE par l'entrepreneur : parts actives ramenées à 100 % (proportions conservées). */
export function normalizeSizeMix(sizes: ProjectSizeEntry[]): ProjectSizeEntry[] {
  const total = sizeMixTotal(sizes);
  if (!(total > 0)) return sizes;
  const active = new Set(activeMix(sizes).map((s) => s.code));
  return sizes.map((s) => (active.has(s.code) && pos(s.sharePct) ? { ...s, sharePct: ((s.sharePct as number) * 100) / total } : s));
}

/**
 * Économie pondérée par la répartition DÉCLARÉE des rendez-vous (refus exclus).
 * w_i = part des rendez-vous, b_i = valeur d'un contrat gagné, c_i = conversion :
 * - valeur attendue par rendez-vous = Σ w_i·b_i·c_i;
 * - contrats par rendez-vous (conversion) = Σ w_i·c_i;
 * - valeur d'un contrat gagné = Σ w_i·b_i·c_i / Σ w_i·c_i.
 * Ainsi panier × conversion = valeur attendue : devis et objectif restent cohérents.
 * Aucune moyenne séparée, aucun arrondi, aucun repli si la répartition est invalide.
 */
export function weightedEconomics(input: Pick<GoalInputs, "basket" | "conversionPct" | "sizes">): {
  basket: number | null;
  conversionPct: number | null;
  expectedValuePerAppointment: number | null;
  source: "declared_mix" | "single_hypothesis";
} {
  const mix = activeMix(input.sizes);
  if (!mix.length) {
    const b = pos(input.basket) ? input.basket : null;
    const c = pos(input.conversionPct) ? input.conversionPct : null;
    return { basket: b, conversionPct: c, expectedValuePerAppointment: b !== null && c !== null ? (b * c) / 100 : null, source: "single_hypothesis" };
  }
  if (validateSizeMix(input.sizes).some((e) => e !== "invalid_size_range")) {
    return { basket: null, conversionPct: null, expectedValuePerAppointment: null, source: "declared_mix" };
  }
  let expected = 0, conv = 0;
  for (const s of mix) {
    const w = (s.sharePct as number) / 100;
    const c = (s.conversionPct as number) / 100;
    expected += w * (s.basket as number) * c;
    conv += w * c;
  }
  return { basket: expected / conv, conversionPct: conv * 100, expectedValuePerAppointment: expected, source: "declared_mix" };
}

export interface GoalNeeds {
  basket: number;
  conversion: number;
  margin: number | null;
  /** Valeur commerciale attendue d'un rendez-vous (panier × conversion [× marge]). */
  expectedValuePerAppointment: number;
  contractsTotal: number;
  appointmentsTotal: number;
  appointmentsPerMonthNeeded: number;
  capacityPerMonth: number;
  capacityGap: number;
}

/** Ce que l'objectif exige, borné par aucune hypothèse cachée. */
export function goalNeeds(i: GoalInputs): GoalNeeds | null {
  if (validateGoal(i).length || !pos(i.amount)) return null;
  const eco = weightedEconomics(i);
  const basket = eco.basket as number;
  const conversion = (eco.conversionPct as number) / 100;
  const margin = typeof i.marginPct === "number" ? i.marginPct / 100 : null;
  const perContract = i.kind === "profit" ? basket * (margin as number) : basket;
  const contractsTotal = Math.ceil(i.amount / perContract);
  const appointmentsTotal = Math.ceil(contractsTotal / conversion);
  const appointmentsPerMonthNeeded = Math.ceil(appointmentsTotal / i.horizonMonths);
  const capacity = i.capacityPerMonth as number;
  return {
    basket,
    conversion,
    margin,
    expectedValuePerAppointment: (eco.expectedValuePerAppointment as number) * (i.kind === "profit" ? (margin as number) : 1),
    contractsTotal,
    appointmentsTotal,
    appointmentsPerMonthNeeded,
    capacityPerMonth: capacity,
    capacityGap: Math.max(0, appointmentsPerMonthNeeded - capacity),
  };
}

/** Valeur initiale du curseur : besoin de l'objectif, plafonné à la capacité déclarée. */
export function initialAppointments(i: GoalInputs): number | null {
  if (!pos(i.capacityPerMonth)) return null;
  const n = goalNeeds({ ...i, appointmentsPerMonth: null });
  const wanted = pos(i.appointmentsPerMonth) ? i.appointmentsPerMonth : n?.appointmentsPerMonthNeeded ?? i.capacityPerMonth;
  return Math.max(1, Math.min(Math.round(wanted), i.capacityPerMonth));
}

export interface AppointmentOutcome {
  appointmentsPerMonth: number;
  contractsPerMonth: number;
  estimatedRevenuePerMonth: number;
  estimatedProfitPerMonth: number | null;
  horizonRevenue: number;
  horizonProfit: number | null;
  /** Part de l'objectif couverte (0-1) sur l'horizon; null sans objectif. */
  goalCoverage: number | null;
}

/** Estimation (jamais une promesse) pour un nombre de rendez-vous choisi. */
export function appointmentOutcome(i: GoalInputs, appointmentsPerMonth: number): AppointmentOutcome | null {
  const eco = weightedEconomics(i);
  if (!pos(eco.basket) || !pos(eco.conversionPct) || !(Number.isInteger(appointmentsPerMonth) && appointmentsPerMonth >= 1)) return null;
  const conversion = (eco.conversionPct as number) / 100;
  const contractsPerMonth = appointmentsPerMonth * conversion;
  const estimatedRevenuePerMonth = appointmentsPerMonth * conversion * (eco.basket as number);
  const margin = typeof i.marginPct === "number" && i.marginPct > 0 ? i.marginPct / 100 : null;
  const estimatedProfitPerMonth = margin === null ? null : estimatedRevenuePerMonth * margin;
  const horizonRevenue = estimatedRevenuePerMonth * i.horizonMonths;
  const horizonProfit = estimatedProfitPerMonth === null ? null : estimatedProfitPerMonth * i.horizonMonths;
  const reached = i.kind === "profit" ? horizonProfit : horizonRevenue;
  const goalCoverage = pos(i.amount) && reached !== null ? Math.min(1, reached / i.amount) : null;
  return { appointmentsPerMonth, contractsPerMonth, estimatedRevenuePerMonth, estimatedProfitPerMonth, horizonRevenue, horizonProfit, goalCoverage };
}

/** Taxes du Québec au cent, mêmes taux que le serveur (TPS 5 %, TVQ 9,975 %). */
export function quebecTaxes(baseCents: number): { gst: number; qst: number; total: number } {
  const b = Math.max(0, Math.round(baseCents));
  const gst = Math.round(b * 0.05);
  const qst = Math.round(b * 0.09975);
  return { gst, qst, total: b + gst + qst };
}

/** Champs serveur dérivés des entrées : la même source lie devis et paiement. */
export function goalQuotePatch(i: GoalInputs, appointmentsPerMonth: number) {
  const eco = weightedEconomics(i);
  const needs = goalNeeds(i);
  return {
    pricing_mode: "goal" as const,
    goal_kind: i.kind,
    goal_amount: pos(i.amount) ? i.amount : undefined,
    horizon_months: i.horizonMonths,
    avg_sale: eco.basket ?? undefined,
    conversion_pct: eco.conversionPct ?? undefined,
    margin_pct: typeof i.marginPct === "number" ? i.marginPct : undefined,
    average_project_value: eco.basket ?? 0,
    close_rate_estimate: eco.conversionPct ? eco.conversionPct / 100 : 0,
    target_monthly_appointments: appointmentsPerMonth,
    next_month_appointments: appointmentsPerMonth,
    /** Capacité en RENDEZ-VOUS par mois, jamais gonflée par la demande. */
    monthly_capacity: i.capacityPerMonth ?? undefined,
    capacity_unit: "appointments_per_month" as const,
    /** Contrats visés PAR MOIS sur l'horizon choisi (aucune hypothèse « année »). */
    contract_goal_value: needs ? needs.contractsTotal / i.horizonMonths : undefined,
    contract_goal_unit: "month" as const,
    horizon_contracts_total: needs?.contractsTotal,
    capacity_gap: needs && needs.capacityGap > 0 ? { needed_per_month: needs.appointmentsPerMonthNeeded, capacity_per_month: needs.capacityPerMonth } : undefined,
    project_size_mix: (i.sizes ?? []).length ? { provenance: "declared" as const, share_unit: SIZE_MIX_SHARE_UNIT, source: eco.source, sizes: i.sizes } : undefined,
  };
}

/** Répartition sérialisée de façon stable (ordre, valeurs, intérêt et fourchettes). */
function sizeMixKey(mix: unknown): string {
  const sizes = (mix as { sizes?: ProjectSizeEntry[] } | null | undefined)?.sizes;
  if (!Array.isArray(sizes)) return "[]";
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10000) / 10000 : null);
  return JSON.stringify([...sizes].sort((a, b) => String(a.code).localeCompare(String(b.code)))
    .map((s) => [s.code, s.stance ?? null, n(s.sharePct), n(s.basket), n(s.conversionPct), n(s.minValue), n(s.maxValue)]));
}

/** Signature stable : un devis n'est payable que s'il correspond aux entrées affichées (répartition incluse). */
export function goalSignature(p: { target_monthly_appointments?: unknown; monthly_capacity?: unknown; average_project_value?: unknown; close_rate_estimate?: unknown; goal_amount?: unknown; goal_kind?: unknown; margin_pct?: unknown; horizon_months?: unknown; project_size_mix?: unknown }): string {
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10000) / 10000 : null);
  return JSON.stringify([n(p.target_monthly_appointments), n(p.monthly_capacity), n(p.average_project_value), n(p.close_rate_estimate), n(p.goal_amount), p.goal_kind ?? "sales", n(p.margin_pct), n(p.horizon_months) ?? 12, sizeMixKey(p.project_size_mix)]);
}
