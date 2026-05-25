/**
 * useSmartContext — merges static registry + admin overrides + dynamic recommendation.
 * Also exposes askAlex(id) to push the entry's alexScript into the Alex chat fallback.
 */
import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getRegistryEntry, SMART_CONTEXT_REGISTRY } from "./registry";
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

/**
 * askAlex — pushes the entry's alexScript into the global Alex session.
 * Uses a CustomEvent so any Alex surface (voice or chat) can react to it.
 */
export function useAskAlex() {
  return useCallback((entryId: string) => {
    const entry = SMART_CONTEXT_REGISTRY[entryId];
    if (!entry?.alexScript) return;
    try {
      window.dispatchEvent(
        new CustomEvent("unpro:alex:script", {
          detail: { fieldId: entryId, script: entry.alexScript, source: "smart-context" },
        }),
      );
    } catch {
      // no-op
    }
  }, []);
}
