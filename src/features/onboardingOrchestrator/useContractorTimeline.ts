import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { OnboardingEvent, OnboardingRow } from "./index";

export function useContractorTimeline(contractorId: string | null | undefined) {
  const [state, setState] = useState<OnboardingRow | null>(null);
  const [events, setEvents] = useState<OnboardingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contractorId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [{ data: s }, { data: e }] = await Promise.all([
        supabase.from("contractor_onboarding_states" as any)
          .select("*").eq("contractor_id", contractorId).maybeSingle(),
        supabase.from("contractor_onboarding_events" as any)
          .select("*").eq("contractor_id", contractorId)
          .order("created_at", { ascending: false }).limit(100),
      ]);
      if (cancelled) return;
      setState((s as any) ?? null);
      setEvents(((e as any) ?? []) as OnboardingEvent[]);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [contractorId]);

  return { state, events, loading };
}
