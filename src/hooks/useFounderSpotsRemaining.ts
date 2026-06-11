import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Returns remaining spots for a founder plan slug, with realtime updates. */
export function useFounderSpotsRemaining(slug: string): number | null {
  const [spots, setSpots] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchSpots = async () => {
      const { data } = await supabase
        .from("founder_plans")
        .select("spots_remaining")
        .eq("slug", slug)
        .maybeSingle();
      if (mounted) setSpots(data?.spots_remaining ?? null);
    };
    fetchSpots();

    const channel = supabase
      .channel(`founder_spots_${slug}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "founder_plans",
          filter: `slug=eq.${slug}`,
        },
        (p) => {
          const next = (p.new as any)?.spots_remaining;
          if (typeof next === "number" && mounted) setSpots(next);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [slug]);

  return spots;
}
