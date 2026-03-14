/**
 * UNPRO — Neighborhood Stats Service
 * Anonymized area intelligence for comparison and social proof.
 * Strict privacy: no individual identification, only aggregated stats.
 */
import { supabase } from "@/integrations/supabase/client";

export interface NeighborhoodStats {
  areaKey: string;
  areaType: "city" | "neighborhood" | "street";
  city?: string;
  neighborhood?: string;
  avgScore: number | null;
  medianScore: number | null;
  propertyCount: number;
  activePassports: number;
  recentImprovements: number;
  topRenovationTypes: string[];
}

export interface ComparisonResult {
  yourScore: number;
  areaAvg: number | null;
  areaLabel: string;
  delta: number | null;
  deltaLabel: string;
  socialProofMessages: string[];
}

/**
 * Fetch neighborhood stats for a given area.
 */
export async function getNeighborhoodStats(
  city: string,
  neighborhood?: string
): Promise<NeighborhoodStats | null> {
  const areaKey = neighborhood
    ? `${city.toLowerCase()}-${neighborhood.toLowerCase()}`.replace(/\s+/g, "-")
    : city.toLowerCase().replace(/\s+/g, "-");
  const areaType = neighborhood ? "neighborhood" : "city";

  const { data, error } = await supabase
    .from("neighborhood_stats")
    .select("*")
    .eq("area_key", areaKey)
    .eq("area_type", areaType)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    areaKey: data.area_key,
    areaType: data.area_type as "city" | "neighborhood" | "street",
    city: data.city ?? undefined,
    neighborhood: data.neighborhood ?? undefined,
    avgScore: data.avg_score ? Number(data.avg_score) : null,
    medianScore: data.median_score ? Number(data.median_score) : null,
    propertyCount: data.property_count ?? 0,
    activePassports: data.active_passports ?? 0,
    recentImprovements: data.recent_improvements ?? 0,
    topRenovationTypes: (data.top_renovation_types as string[]) || [],
  };
}

/**
 * Compare a property score with its area average.
 */
export function compareWithArea(
  yourScore: number,
  areaStats: NeighborhoodStats | null,
  city: string
): ComparisonResult {
  const areaAvg = areaStats?.avgScore ?? null;
  const delta = areaAvg != null ? yourScore - areaAvg : null;
  const areaLabel = areaStats?.neighborhood || city;

  let deltaLabel = "Données insuffisantes";
  if (delta != null) {
    if (delta >= 15) deltaLabel = "Bien au-dessus de la moyenne";
    else if (delta >= 5) deltaLabel = "Au-dessus de la moyenne";
    else if (delta >= -5) deltaLabel = "Dans la moyenne";
    else if (delta >= -15) deltaLabel = "Sous la moyenne";
    else deltaLabel = "Bien en dessous de la moyenne";
  }

  // Anonymized social proof messages
  const socialProofMessages: string[] = [];
  if (areaStats) {
    if (areaStats.activePassports > 3) {
      socialProofMessages.push(
        `${areaStats.activePassports} propriétaires actifs dans votre secteur`
      );
    }
    if (areaStats.recentImprovements > 0) {
      socialProofMessages.push(
        `${areaStats.recentImprovements} améliorations récentes à proximité`
      );
    }
    if (areaStats.propertyCount >= 5) {
      socialProofMessages.push(
        `Score moyen du secteur : ${Math.round(areaAvg!)} / 100`
      );
    }
    if (areaStats.topRenovationTypes.length > 0) {
      socialProofMessages.push(
        `Tendance locale : ${areaStats.topRenovationTypes.slice(0, 2).join(", ")}`
      );
    }
  }

  return { yourScore, areaAvg, areaLabel, delta, deltaLabel, socialProofMessages };
}
