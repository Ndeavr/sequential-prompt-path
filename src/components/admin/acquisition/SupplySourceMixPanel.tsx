/**
 * SupplySourceMixPanel — discovery mix by SOURCE.
 * Makes it obvious when the Google Places quota is blocked but official Québec
 * sources keep producing eligible recruitment candidates.
 * Reads `v_supply_discovery_by_source` + `official_source_registry`.
 */
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, BadgeCheck, Globe, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type SourceRow = {
  source_key: string;
  source_label: string;
  records_total: number;
  records_new: number;
  eligible_yield: number;
  promoted: number;
  last_activity_at: string | null;
};

type RegistryRow = {
  source_key: string;
  source_name: string;
  source_url: string;
  certification: string | null;
  last_fetched_at: string | null;
  last_record_count: number;
  active: boolean;
};

const ICONS: Record<string, typeof Globe> = {
  official_quebec: BadgeCheck,
  google_places: Globe,
  existing_db: Database,
};

export function SupplySourceMixPanel() {
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [registry, setRegistry] = useState<RegistryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [mix, reg] = await Promise.all([
      supabase.from("v_supply_discovery_by_source").select("*").returns<SourceRow[]>(),
      supabase
        .from("official_source_registry")
        .select("source_key,source_name,source_url,certification,last_fetched_at,last_record_count,active")
        .returns<RegistryRow[]>(),
    ]);
    if (mix.error) setError(mix.error.message);
    else setRows(mix.data ?? []);
    if (!reg.error) setRegistry(reg.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Découverte par source</h2>
          <p className="text-xs text-muted-foreground">
            Sources officielles Québec, Google Places et inventaire interne — rendement éligible par source.
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {rows.map((r) => {
          const Icon = ICONS[r.source_key] ?? Database;
          return (
            <div key={r.source_key} className="rounded-xl border border-border bg-card/60 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Icon className="h-4 w-4 text-muted-foreground" />
                {r.source_label}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Fiches</div>
                  <div className="text-lg font-semibold text-foreground">{r.records_total}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Éligibles</div>
                  <div className="text-lg font-semibold text-emerald-500">{r.eligible_yield}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Nouvelles 24 h</div>
                  <div className="text-foreground">{r.records_new}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Promues</div>
                  <div className="text-foreground">{r.promoted}</div>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {r.last_activity_at
                  ? `Dernière activité : ${new Date(r.last_activity_at).toLocaleString("fr-CA")}`
                  : "Aucune activité"}
              </div>
            </div>
          );
        })}
      </div>

      {registry.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Sources officielles enregistrées</div>
          {registry.map((s) => (
            <div key={s.source_key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
              <div className="flex items-center gap-2 text-foreground">
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>{s.source_name}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span>{s.last_record_count} fiches</span>
                <span>
                  {s.last_fetched_at ? new Date(s.last_fetched_at).toLocaleDateString("fr-CA") : "jamais"}
                </span>
                <a href={s.source_url} target="_blank" rel="noreferrer" className="underline hover:text-foreground">
                  Document officiel
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && rows.length === 0 && !error && (
        <div className="text-xs text-muted-foreground">Aucune donnée de découverte.</div>
      )}
    </section>
  );
}
