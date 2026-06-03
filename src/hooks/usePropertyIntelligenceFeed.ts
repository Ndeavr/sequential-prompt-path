/**
 * usePropertyIntelligenceFeed — returns rotating intelligence insights for the
 * homepage ticker. v1: static FR-CA dataset. Future: branch on Supabase signals.
 */
import { useMemo } from "react";
import { HOME_INTELLIGENCE_INSIGHTS, type IntelligenceInsight } from "@/data/homeIntelligenceTicker";

export function usePropertyIntelligenceFeed(limit = 6): IntelligenceInsight[] {
  return useMemo(() => HOME_INTELLIGENCE_INSIGHTS.slice(0, limit), [limit]);
}
