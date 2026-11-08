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

export interface ProjectSizeEntry {
  code: ProjectSizeCode;
  /** Panier moyen déclaré pour cette taille (CAD HT). */
  basket?: number | null;
  /** Part déclarée des mandats (%). */
  sharePct?: number | null;
  /** Conversion propre à cette taille (%), sinon conversion globale. */
  conversionPct?: number | null;
  stance?: SizeStance;
}

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
  | "invalid_size_mix";

export const SIZE_LABELS: Record<"fr" | "en", Record<ProjectSizeCode, string>> = {
  fr: { small: "Petits projets", medium: "Projets moyens", large: "Grands projets" },
  en: { small: "Small projects", medium: "Medium projects", large: "Large projects" },
};

const pos = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;

/** Panier et conversion pondérés par la répartition DÉCLARÉE (tailles refusées exclues). */
export function weightedEconomics(input: Pick<GoalInputs, "basket" | "conversionPct" | "sizes">): {
  basket: number | null;
  conversionPct: number | null;
  source: "declared_mix" | "single_hypothesis";
} {
  const mix = (input.sizes ?? []).filter((s) => s.stance !== "refused" && pos(s.sharePct) && pos(s.basket));
  const totalShare = mix.reduce((a, s) => a + (s.sharePct as number), 0);
  if (!mix.length || totalShare <= 0) {
    return { basket: pos(input.basket) ? input.basket : null, conversionPct: pos(input.conversionPct) ? input.conversionPct : null, source: "single_hypothesis" };
  }
  const basket = mix.reduce((a, s) => a + (s.basket as number) * (s.sharePct as number), 0) / totalShare;
  const convs = mix.map((s) => (pos(s.conversionPct) ? s.conversionPct : input.conversionPct));
  const conversionPct = convs.every(pos)
    ? mix.reduce((a, s, i) => a + (convs[i] as number) * (s.sharePct as number), 0) / totalShare
    : pos(input.conversionPct) ? input.conversionPct : null;
  return { basket: Math.round(basket), conversionPct: conversionPct === null ? null : Math.round(conversionPct * 100) / 100, source: "declared_mix" };
}

export function validateGoal(i: GoalInputs): GoalError[] {
  const errors: GoalError[] = [];
  const eco = weightedEconomics(i);
  if (i.amount !== null && !(Number.isFinite(i.amount) && i.amount > 0)) errors.push("invalid_amount");
  if (!(Number.isInteger(i.horizonMonths) && i.horizonMonths >= 1 && i.horizonMonths <= 36)) errors.push("invalid_horizon");
  if (!pos(eco.basket)) errors.push("invalid_basket");
  if (!(pos(eco.conversionPct) && (eco.conversionPct as number) <= 100)) errors.push("invalid_conversion");
  if (i.kind === "profit") {
    if (i.marginPct === null || i.marginPct === undefined) errors.push("missing_margin");
    else if (!(i.marginPct > 0 && i.marginPct <= 100)) errors.push("invalid_margin");
  } else if (i.marginPct !== null && i.marginPct !== undefined && !(i.marginPct >= 0 && i.marginPct <= 100)) {
    errors.push("invalid_margin");
  }
  if (!(pos(i.capacityPerMonth) && Number.isInteger(i.capacityPerMonth))) errors.push("invalid_capacity");
  if (i.appointmentsPerMonth !== null && !(Number.isInteger(i.appointmentsPerMonth) && i.appointmentsPerMonth >= 1)) errors.push("invalid_appointments");
  const shares = (i.sizes ?? []).filter((s) => s.stance !== "refused" && typeof s.sharePct === "number");
  if (shares.some((s) => (s.sharePct as number) < 0 || (s.sharePct as number) > 100)) errors.push("invalid_size_mix");
  return errors;
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
    expectedValuePerAppointment: Math.round(basket * conversion * (i.kind === "profit" ? (margin as number) : 1)),
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
  const contractsPerMonth = Math.round(appointmentsPerMonth * conversion * 100) / 100;
  const estimatedRevenuePerMonth = Math.round(appointmentsPerMonth * conversion * (eco.basket as number));
  const margin = typeof i.marginPct === "number" && i.marginPct > 0 ? i.marginPct / 100 : null;
  const estimatedProfitPerMonth = margin === null ? null : Math.round(estimatedRevenuePerMonth * margin);
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
    contract_goal_value: needs?.contractsTotal,
    contract_goal_unit: "year" as const,
    capacity_gap: needs && needs.capacityGap > 0 ? { needed_per_month: needs.appointmentsPerMonthNeeded, capacity_per_month: needs.capacityPerMonth } : undefined,
    project_size_mix: (i.sizes ?? []).length ? { provenance: "declared" as const, source: eco.source, sizes: i.sizes } : undefined,
  };
}

/** Signature stable : un devis n'est payable que s'il correspond aux entrées affichées. */
export function goalSignature(p: { target_monthly_appointments?: unknown; monthly_capacity?: unknown; average_project_value?: unknown; close_rate_estimate?: unknown; goal_amount?: unknown; goal_kind?: unknown; margin_pct?: unknown; horizon_months?: unknown }): string {
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10000) / 10000 : null);
  return JSON.stringify([n(p.target_monthly_appointments), n(p.monthly_capacity), n(p.average_project_value), n(p.close_rate_estimate), n(p.goal_amount), p.goal_kind ?? "sales", n(p.margin_pct), n(p.horizon_months) ?? 12]);
}
