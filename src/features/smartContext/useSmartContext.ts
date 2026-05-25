/**
 * useSmartContext — merges static registry + admin overrides + dynamic recommendation.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getRegistryEntry } from "./registry";
import { recommend } from "@/services/smartRecommendationEngine";
import type { SmartContextEntry, SmartContextRuntime } from "./types";

interface OverrideRow {
  field_id: string;
  payload: Partial<SmartContextEntry>;
}

export function useSmartContext(id: string, runtime: SmartContextRuntime = {}) {
  const { data: override } = useQuery<OverrideRow | null>({
    queryKey: ["smart-context-override", id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("smart_context_overrides")
        .select("field_id, payload")
        .eq("field_id", id)
        .eq("active", true)
        .maybeSingle();
      return (data as OverrideRow | null) ?? null;
    },
    staleTime: 5 * 60_000,
  });

  return useMemo<SmartContextEntry | null>(() => {
    const base = getRegistryEntry(id);
    if (!base) return null;
    const merged: SmartContextEntry = { ...base, ...(override?.payload ?? {}) };
    const dynamic = recommend(id, runtime);
    if (dynamic) merged.recommendation = dynamic;
    return merged;
  }, [id, override, runtime.cityName, runtime.tradeSlug, runtime.capacity, runtime.goal, runtime.currentValue]);
}
