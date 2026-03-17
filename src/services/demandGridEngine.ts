/**
 * UNPRO — City-Service-Demand Grid Engine
 * Identifies and prioritizes high-value city × trade × service × season combinations.
 */

export interface DemandGridCell {
  id: string;
  city_slug: string;
  trade_slug: string;
  service_slug: string | null;
  season: string | null;
  urgency_level: string;
  demand_score: number;
  supply_score: number;
  gap_score: number;
  estimated_value_cents: number;
  priority_rank: number;
  has_seo_page: boolean;
  has_ad_campaign: boolean;
  has_contractors: boolean;
  recommended_actions: RecommendedAction[];
  last_analyzed_at: string | null;
}

export interface RecommendedAction {
  type: "create_seo_page" | "create_ad" | "recruit_contractor" | "adjust_pricing" | "notify_contractors";
  label_fr: string;
  priority: "high" | "medium" | "low";
  auto_executable: boolean;
}

export type Season = "winter" | "spring" | "summer" | "fall";

// Seasonal service mapping
export const SEASONAL_SERVICES: Record<Season, string[]> = {
  winter: ["isolation", "chauffage", "deneigement", "barriere-de-glace", "coupe-froid", "fournaise"],
  spring: ["drainage", "fondation", "toiture", "gouttiere", "peinture-exterieure", "terrassement"],
  summer: ["patio", "cloture", "amenagement-paysager", "piscine", "peinture", "renovation-cuisine"],
  fall: ["isolation", "fenetre", "calfeutrage", "inspection-toiture", "nettoyage-gouttiere", "chauffage"],
};

export function getCurrentSeason(): Season {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

export function computeGapScore(demand: number, supply: number): number {
  if (supply === 0) return demand * 2;
  return Math.round((demand - supply) * (demand / Math.max(supply, 1)));
}

export function prioritizeGrid(cells: DemandGridCell[]): DemandGridCell[] {
  return [...cells].sort((a, b) => {
    // Primary: gap score (high demand, low supply)
    const gapDiff = b.gap_score - a.gap_score;
    if (Math.abs(gapDiff) > 5) return gapDiff;
    // Secondary: estimated value
    return b.estimated_value_cents - a.estimated_value_cents;
  }).map((cell, i) => ({ ...cell, priority_rank: i + 1 }));
}

export function generateRecommendedActions(cell: DemandGridCell): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  if (!cell.has_seo_page && cell.gap_score > 20) {
    actions.push({
      type: "create_seo_page",
      label_fr: `Créer page SEO: ${cell.trade_slug} ${cell.city_slug}`,
      priority: "high",
      auto_executable: true,
    });
  }

  if (!cell.has_ad_campaign && cell.gap_score > 40) {
    actions.push({
      type: "create_ad",
      label_fr: `Lancer campagne publicitaire`,
      priority: "high",
      auto_executable: false,
    });
  }

  if (!cell.has_contractors && cell.demand_score > 30) {
    actions.push({
      type: "recruit_contractor",
      label_fr: `Recruter entrepreneur: ${cell.trade_slug} à ${cell.city_slug}`,
      priority: "high",
      auto_executable: false,
    });
  }

  if (cell.gap_score > 60) {
    actions.push({
      type: "adjust_pricing",
      label_fr: `Ajuster tarification (forte demande)`,
      priority: "medium",
      auto_executable: true,
    });
  }

  if (cell.has_contractors && cell.demand_score > 50) {
    actions.push({
      type: "notify_contractors",
      label_fr: `Notifier entrepreneurs disponibles`,
      priority: "medium",
      auto_executable: true,
    });
  }

  return actions;
}

export function getSeasonalOpportunities(currentSeason: Season, cities: string[], trades: string[]): Array<{
  city: string;
  trade: string;
  season: Season;
  relevance: number;
}> {
  const seasonalTrades = SEASONAL_SERVICES[currentSeason];
  const opportunities: Array<{ city: string; trade: string; season: Season; relevance: number }> = [];

  for (const city of cities) {
    for (const trade of trades) {
      const isSeasonalMatch = seasonalTrades.some((s) => trade.includes(s));
      if (isSeasonalMatch) {
        opportunities.push({ city, trade, season: currentSeason, relevance: 80 + Math.random() * 20 });
      }
    }
  }

  return opportunities.sort((a, b) => b.relevance - a.relevance);
}
