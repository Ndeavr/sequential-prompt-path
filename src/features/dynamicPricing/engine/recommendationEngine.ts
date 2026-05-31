import {
  type GrowthProfile,
  type MarketScore,
  type PlanRecommendation,
  type PlanSlug,
  type PricingCoefficients,
  type PricingOverride,
  PLAN_BASE_PRICES_CENTS,
  PLAN_ORDER,
} from "./types";

export const DEFAULT_COEFFICIENTS: PricingCoefficients = {
  competition_weight: 0.30,
  demand_weight: 0.25,
  ticket_weight: 0.20,
  exclusivity_premium: 0.40,
  rarity_premium: 0.25,
  seasonality_weight: 0.10,
  min_price_floor_cents: 14900,
  max_price_ceiling_cents: 499900,
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function planIndex(slug: PlanSlug): number {
  const i = PLAN_ORDER.indexOf(slug);
  return i === -1 ? 1 : i;
}

function maxPlan(a: PlanSlug, b: PlanSlug): PlanSlug {
  return planIndex(a) >= planIndex(b) ? a : b;
}

/** Aggregate market score across the contractor's preferred (territory × trade) pairs. */
export function aggregateMarketScore(markets: MarketScore[]): MarketScore | null {
  if (markets.length === 0) return null;
  const sum = (k: keyof MarketScore) =>
    markets.reduce((acc, m) => acc + Number(m[k] ?? 0), 0) / markets.length;
  return {
    territory: markets.map((m) => m.territory).join(", "),
    trade: markets[0].trade,
    competitionScore: Math.round(sum("competitionScore")),
    avgCpcCents: Math.round(sum("avgCpcCents")),
    demandScore: Math.round(sum("demandScore")),
    avgProjectValueCents: Math.round(sum("avgProjectValueCents")),
    aiDifficultyScore: Math.round(sum("aiDifficultyScore")),
    rarityScore: Math.round(sum("rarityScore")),
    exclusivitySlotsTotal: markets.reduce((a, m) => a + m.exclusivitySlotsTotal, 0),
    exclusivitySlotsTaken: markets.reduce((a, m) => a + m.exclusivitySlotsTaken, 0),
    recommendedMinPlan: markets.reduce<PlanSlug>(
      (a, m) => maxPlan(a, m.recommendedMinPlan),
      "recrue",
    ),
    seasonalityMultiplier: sum("seasonalityMultiplier"),
  };
}

export function computeMarketScore(m: MarketScore): number {
  // Weighted blend: demand + (100-aiDifficulty) + rarity + ticket attractiveness
  const ticketScore = clamp((m.avgProjectValueCents / 1_000_000) * 100, 0, 100);
  const score = m.demandScore * 0.35 + (100 - m.aiDifficultyScore) * 0.2 + m.rarityScore * 0.2 + ticketScore * 0.25;
  return Math.round(clamp(score, 0, 100));
}

export function computeOpportunityScore(p: GrowthProfile, m: MarketScore): number {
  const capacityScore = clamp((p.monthlyCapacity / 50) * 100, 0, 100);
  const slotsScore = m.exclusivitySlotsTotal > 0
    ? clamp(((m.exclusivitySlotsTotal - m.exclusivitySlotsTaken) / m.exclusivitySlotsTotal) * 100, 0, 100)
    : 50;
  const growthScore = clamp(p.targetGrowthPercent, 0, 100);
  return Math.round(capacityScore * 0.35 + slotsScore * 0.35 + growthScore * 0.3);
}

export function selectPlan(p: GrowthProfile, m: MarketScore, marketScore: number): PlanSlug {
  const ticketUsd = p.avgTicketCents / 100;
  let plan: PlanSlug;
  if (p.monthlyCapacity < 5) plan = "recrue";
  else if (marketScore < 40) plan = "pro";
  else if (marketScore < 70) plan = "pro";
  else if (p.wantsExclusivity && m.exclusivitySlotsTaken < m.exclusivitySlotsTotal) {
    plan = ticketUsd > 8000 ? "signature" : "elite";
  } else if (ticketUsd > 10000) plan = "elite";
  else plan = "premium";
  // enforce market min
  return maxPlan(plan, m.recommendedMinPlan);
}

export function computeDynamicPrice(
  plan: PlanSlug,
  p: GrowthProfile,
  m: MarketScore,
  c: PricingCoefficients,
  override?: PricingOverride | null,
): { priceCents: number; basePriceCents: number; modifiers: PlanRecommendation["reason"] } {
  if (plan === "custom") {
    return {
      priceCents: clamp(p.avgTicketCents, c.min_price_floor_cents, c.max_price_ceiling_cents),
      basePriceCents: 0,
      modifiers: {
        bullets: ["Plan sur mesure — prix négocié avec Alex"],
        marketModifierPct: 0,
        exclusivityModifierPct: 0,
        rarityModifierPct: 0,
        seasonalityModifierPct: 0,
        overrideApplied: false,
      },
    };
  }

  const basePrice = PLAN_BASE_PRICES_CENTS[plan];
  const marketMod =
    (m.competitionScore * c.competition_weight +
      m.demandScore * c.demand_weight +
      clamp((p.avgTicketCents / 500_000) * 100, 0, 100) * c.ticket_weight) /
    100 /
    3; // normalize: avg of weighted 0–100 / 100 -> 0–~0.3
  const slotsAvailable = m.exclusivitySlotsTotal - m.exclusivitySlotsTaken > 0;
  const exclMod = p.wantsExclusivity && slotsAvailable ? c.exclusivity_premium : 0;
  const rarityMod = m.rarityScore > 70 ? c.rarity_premium : 0;
  const seasonMod = (m.seasonalityMultiplier - 1) * c.seasonality_weight * 10;

  let final = basePrice * (1 + marketMod + exclMod + rarityMod + seasonMod);
  let overrideApplied = false;
  if (override?.forced_price_cents) {
    final = override.forced_price_cents;
    overrideApplied = true;
  }
  final = clamp(Math.round(final), c.min_price_floor_cents, c.max_price_ceiling_cents);

  const bullets: string[] = [];
  if (m.demandScore > 70) bullets.push(`Forte demande détectée à ${m.territory} (${m.demandScore}/100)`);
  if (m.competitionScore > 70) bullets.push(`Compétition élevée (${m.competitionScore}/100) — visibilité IA essentielle`);
  if (p.wantsExclusivity && slotsAvailable) bullets.push(`Exclusivité territoriale disponible — premium appliqué`);
  if (m.rarityScore > 70) bullets.push(`Métier rare dans ce territoire — opportunité unique`);
  if (p.avgTicketCents > 1_000_000) bullets.push(`Ticket moyen élevé — peu de RDV très qualifiés requis`);
  if (overrideApplied) bullets.push(`Tarif override admin: ${override?.reason ?? "n/a"}`);

  return {
    priceCents: final,
    basePriceCents: basePrice,
    modifiers: {
      bullets,
      marketModifierPct: Math.round(marketMod * 1000) / 10,
      exclusivityModifierPct: Math.round(exclMod * 1000) / 10,
      rarityModifierPct: Math.round(rarityMod * 1000) / 10,
      seasonalityModifierPct: Math.round(seasonMod * 1000) / 10,
      overrideApplied,
    },
  };
}

export function estimateAppointments(
  p: GrowthProfile,
  m: MarketScore,
  plan: PlanSlug,
): { min: number; max: number } {
  const planMult: Record<PlanSlug, number> = {
    recrue: 0.4,
    pro: 0.7,
    premium: 1.0,
    elite: 1.4,
    signature: 1.8,
    custom: 1.2,
  };
  const demandFactor = m.demandScore / 100;
  const cap = p.monthlyCapacity;
  const target = cap * planMult[plan] * (0.6 + 0.4 * demandFactor);
  return { min: Math.max(1, Math.round(target * 0.7)), max: Math.max(2, Math.round(target * 1.1)) };
}

export function estimateRevenue(appts: { min: number; max: number }, p: GrowthProfile) {
  const closeRate = 0.45; // conservative
  const min = Math.round(appts.min * closeRate * p.avgTicketCents);
  const max = Math.round(appts.max * 0.65 * p.avgTicketCents);
  // cap at $100k/mo per existing AppointmentCalculator memory
  return { min: Math.min(min, 10_000_000), max: Math.min(max, 10_000_000) };
}

export function generateRecommendation(
  profile: GrowthProfile,
  markets: MarketScore[],
  coefficients: PricingCoefficients,
  override?: PricingOverride | null,
): PlanRecommendation {
  const aggregated = aggregateMarketScore(markets) ?? {
    territory: profile.preferredTerritories[0] ?? "—",
    trade: profile.preferredJobTypes[0] ?? "—",
    competitionScore: 50,
    avgCpcCents: 500,
    demandScore: 50,
    avgProjectValueCents: profile.avgTicketCents,
    aiDifficultyScore: 50,
    rarityScore: 50,
    exclusivitySlotsTotal: 3,
    exclusivitySlotsTaken: 0,
    recommendedMinPlan: "pro" as PlanSlug,
    seasonalityMultiplier: 1.0,
  };

  const marketScore = computeMarketScore(aggregated);
  const opportunityScore = computeOpportunityScore(profile, aggregated);
  let plan = selectPlan(profile, aggregated, marketScore);
  if (override?.forced_plan_slug) plan = override.forced_plan_slug;

  const { priceCents, basePriceCents, modifiers } = computeDynamicPrice(
    plan,
    profile,
    aggregated,
    coefficients,
    override,
  );
  const appts = estimateAppointments(profile, aggregated, plan);
  const revenue = estimateRevenue(appts, profile);

  const slotsAvailable = aggregated.exclusivitySlotsTotal - aggregated.exclusivitySlotsTaken;
  const exclusivityLevel: PlanRecommendation["exclusivityLevel"] =
    !profile.wantsExclusivity || slotsAvailable <= 0
      ? "none"
      : slotsAvailable === 1
        ? "full"
        : "partial";

  const territoryPriority: PlanRecommendation["territoryPriority"] =
    marketScore >= 80 ? "critical" : marketScore >= 65 ? "high" : marketScore >= 45 ? "medium" : "low";

  const priceModifierPct = basePriceCents
    ? Math.round(((priceCents - basePriceCents) / basePriceCents) * 1000) / 10
    : 0;

  return {
    recommendedPlanSlug: plan,
    recommendedPriceCents: priceCents,
    basePlanPriceCents: basePriceCents,
    priceModifierPct,
    estimatedMonthlyAppointmentsMin: appts.min,
    estimatedMonthlyAppointmentsMax: appts.max,
    estimatedRevenueMinCents: revenue.min,
    estimatedRevenueMaxCents: revenue.max,
    exclusivityLevel,
    territoryPriority,
    marketScore,
    opportunityScore,
    competitionScore: aggregated.competitionScore,
    reason: modifiers,
  };
}
