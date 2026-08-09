/**
 * DiscoveryHealthPanel — Supply / Discovery resilience cockpit.
 * Reads `v_places_discovery_health`: circuit state, 24h external calls,
 * cache hit rate, calls avoided, and the active remediation.
 */
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, ShieldAlert, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Health = {
  provider: string;
  state: string;
  kill_switch: boolean;
  failure_count: number;
  last_error_code: string | null;
  last_error_message: string | null;
  remediation: string | null;
  retry_after: string | null;
  last_success_at: string | null;
  calls_24h: number;
  external_calls_24h: number;
  cache_hits_24h: number;
  calls_avoided_24h: number;
  errors_24h: number;
  results_24h: number;
  cache_hit_rate_pct: number;
  cache_entries_fresh: number;
};

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold text-foreground">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function DiscoveryHealthPanel() {
  const [rows, setRows] = useState<Health[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("v_places_discovery_health")
      .select("*")
      .returns<Health[]>();
    if (error) setError(error.message);
    else setRows(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <section className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Santé Supply / Découverte</h2>
          <p className="text-xs text-muted-foreground">
            Cache, dédoublonnage et disjoncteur devant Google Places — le quota ne peut plus affamer le recrutement.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-foreground hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Rafraîchir
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive-foreground">
          {error}
        </div>
      )}

      {rows.map((h) => {
        const open = h.kill_switch || h.state === "open";
        return (
          <div key={h.provider} className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                  open
                    ? "bg-destructive/15 text-destructive"
                    : "bg-emerald-500/15 text-emerald-500"
                }`}
              >
                {open ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                {h.provider} — {h.kill_switch ? "arrêt manuel" : open ? "disjoncteur ouvert" : "disponible"}
              </span>
              {h.retry_after && open && (
                <span className="text-xs text-muted-foreground">
                  Reprise : {new Date(h.retry_after).toLocaleString("fr-CA")}
                </span>
              )}
              {h.last_success_at && (
                <span className="text-xs text-muted-foreground">
                  Dernier succès : {new Date(h.last_success_at).toLocaleString("fr-CA")}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <Metric label="Appels externes 24 h" value={h.external_calls_24h} hint="facturés" />
              <Metric label="Appels évités" value={h.calls_avoided_24h} hint="grâce au cache" />
              <Metric label="Taux de cache" value={`${h.cache_hit_rate_pct}%`} hint={`${h.cache_hits_24h}/${h.calls_24h}`} />
              <Metric label="Entrées en cache" value={h.cache_entries_fresh} hint="fraîches" />
              <Metric label="Résultats 24 h" value={h.results_24h} hint="fiches trouvées" />
              <Metric label="Erreurs 24 h" value={h.errors_24h} hint={h.last_error_code ?? "aucune"} />
            </div>

            {open && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                <Database className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <div className="font-medium">
                    Découverte en pause — le recrutement continue sur l'inventaire existant et le cache.
                  </div>
                  <div className="mt-1 opacity-90">{h.remediation ?? h.last_error_message}</div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {!loading && rows.length === 0 && !error && (
        <div className="text-xs text-muted-foreground">Aucune donnée de découverte.</div>
      )}
    </section>
  );
}
