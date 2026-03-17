/**
 * UNPRO — Sales Psychology Hook
 * Provides microcopy and trust elements from DB + static library.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getMicrocopy,
  getBestCopy,
  interpolateCopy,
  generateTrustBadges,
  MICROCOPY_LIBRARY,
  type CopyContext,
  type Audience,
  type Placement,
  type Microcopy,
} from "@/services/salesPsychologyEngine";

// Fetch from DB (overrides + A/B tests)
export const useMicrocopyDB = (context?: CopyContext, audience?: Audience) =>
  useQuery<Microcopy[]>({
    queryKey: ["sales-microcopy", context, audience],
    queryFn: async () => {
      let q = supabase.from("sales_microcopy").select("*").eq("is_active", true).order("priority", { ascending: false });
      if (context) q = q.eq("context", context);
      if (audience) q = q.or(`audience.eq.${audience},audience.eq.both`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Microcopy[];
    },
    staleTime: 120_000,
  });

// Combined: DB first, fallback to static library
export function useMicrocopy(context: CopyContext, audience: Audience, placement?: Placement) {
  const { data: dbCopies } = useMicrocopyDB(context, audience);

  const filtered = dbCopies?.filter((m) => !placement || m.placement === placement);

  if (filtered && filtered.length > 0) {
    return { copies: filtered, best: filtered[0].text_fr };
  }

  // Fallback to static library
  const staticCopies = getMicrocopy(context, audience, placement);
  return {
    copies: staticCopies as Microcopy[],
    best: getBestCopy(context, audience, placement),
  };
}

export { interpolateCopy, generateTrustBadges, MICROCOPY_LIBRARY };
