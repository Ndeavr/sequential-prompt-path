/**
 * useImpactSnapshot — total d'impact public, calculé côté serveur
 * (RPC get_public_impact_snapshot). Aucune croissance simulée côté client :
 * la valeur change seulement quand le serveur renvoie un nouveau total.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ImpactSnapshot {
  formula_version: string;
  eligible_matches: number;
  period_start: string | null;
  last_event_at: string | null;
  computed_at: string;
  homeowner_hours: number;
  contractor_hours: number;
  hours_saved: number;
  hours_status: "estimated" | "measured";
  dollars_saved: number | null;
  dollars_status: "measuring" | "measured";
  homeowner_hours_per_match: number;
  contractor_hours_per_match: number;
  assumptions: string;
}

export const IMPACT_REFRESH_MS = 60_000;

export function useImpactSnapshot() {
  const [data, setData] = useState<ImpactSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: res, error: err } = await supabase.rpc("get_public_impact_snapshot" as never);
    if (err || !res) setError(true);
    else {
      setError(false);
      setData(res as unknown as ImpactSnapshot); // last good value kept on later errors
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, IMPACT_REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  return { data, error, loading };
}

export const fmtHours = (n: number) =>
  `${n.toLocaleString("fr-CA", { maximumFractionDigits: 1 })} h`;

export const fmtDateQc = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" }) : "—";
