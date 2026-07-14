/**
 * useFounderSlots — live count of remaining Founder Activation slots.
 * Reads from public view `v_founder_slots_public` (10 max).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FounderSlotsState {
  remaining: number;
  claimed: number;
  total: number;
  loading: boolean;
}

export function useFounderSlots(): FounderSlotsState {
  const [state, setState] = useState<FounderSlotsState>({ remaining: 10, claimed: 0, total: 10, loading: true });

  useEffect(() => {
    let cancelled = false;
    const fetchSlots = async () => {
      const { data } = await supabase.from("v_founder_slots_public" as any).select("*").maybeSingle();
      if (cancelled || !data) return;
      const d = data as any;
      setState({ remaining: Number(d.remaining) || 0, claimed: Number(d.claimed) || 0, total: Number(d.total) || 10, loading: false });
    };
    fetchSlots();
    const t = setInterval(fetchSlots, 15000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return state;
}
