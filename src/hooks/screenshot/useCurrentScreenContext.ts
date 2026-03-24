/**
 * UNPRO — Resolves the current screen context from the route
 */
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ScreenContext } from "@/types/screenshot";

const SCREEN_ROUTE_MAP: Record<string, { pattern: RegExp; extractors: Record<string, number> }> = {
  contractor_profile_screen: { pattern: /^\/contractors\/([^/]+)/, extractors: { entitySlug: 1 } },
  aipp_score_result_screen: { pattern: /^\/aipp\/result\/([^/]+)/, extractors: { entitySlug: 1 } },
  alex_match_result_screen: { pattern: /^\/alex\/match\/([^/]+)/, extractors: { entityId: 1 } },
  booking_confirmation_screen: { pattern: /^\/booking\/confirmation\/([^/]+)/, extractors: { entityId: 1 } },
  plan_comparison_screen: { pattern: /^\/plans/, extractors: {} },
  project_showcase_screen: { pattern: /^\/projects\/([^/]+)/, extractors: { entitySlug: 1 } },
};

export function useCurrentScreenContext(): ScreenContext | null {
  const { pathname } = useLocation();

  const { data: catalog } = useQuery({
    queryKey: ["screen_catalog"],
    queryFn: async () => {
      const { data } = await supabase.from("screen_catalog").select("*").eq("is_active", true);
      return data ?? [];
    },
    staleTime: 60_000 * 10,
  });

  return useMemo(() => {
    if (!catalog) return null;

    for (const entry of SCREEN_ROUTE_MAP) {
      // unused, iterate catalog instead
    }

    for (const screen of catalog) {
      const mapping = SCREEN_ROUTE_MAP[screen.screen_key];
      if (!mapping) continue;

      const match = pathname.match(mapping.pattern);
      if (!match) continue;

      const extracted: Record<string, string> = {};
      for (const [key, idx] of Object.entries(mapping.extractors)) {
        if (match[idx]) extracted[key] = match[idx];
      }

      return {
        screenKey: screen.screen_key,
        screenName: screen.screen_name,
        routePath: pathname,
        entityType: screen.entity_type ?? undefined,
        entityId: extracted.entityId,
        entitySlug: extracted.entitySlug,
        isShareWorthy: screen.is_share_worthy ?? false,
        sharePriorityWeight: screen.share_priority_weight ?? 5,
      };
    }

    return null;
  }, [pathname, catalog]);
}
