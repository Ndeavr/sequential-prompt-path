/**
 * Découverte de nouvelles entreprises — panneau opérationnel.
 * Production uniquement : plafond, consommation, coupe-circuit, erreurs réelles.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Radar } from "lucide-react";

type Run = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  trigger_source: string | null;
  searches_executed: number;
  external_calls: number;
  found: number;
  inserted: number;
  bridged_verified: number;
  queued: number;
  blocked_reason: string | null;
  errors: unknown;
};

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("fr-CA") : "—");

/** Prochaine exécution du cycle automatique (toutes les 6 heures, minute 7). */
function nextDiscoveryRun(): string {
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(7, 0, 0);
  const h = now.getHours();
  const nextHour = (Math.floor(h / 6) + (h % 6 === 0 && now.getMinutes() < 7 ? 0 : 1)) * 6;
  next.setHours(nextHour);
  if (next <= now) next.setHours(next.getHours() + 6);
  return next.toLocaleString("fr-CA");
}

export default function DiscoveryPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [budget, setBudget] = useState<{ used: number; limit: number } | null>(null);
  const [circuit, setCircuit] = useState<{ state: string; kill: boolean; error: string | null } | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const [runRes, budgetRes, circuitRes, flagRes] = await Promise.all([
      supabase.from("acquisition_discovery_runs").select("*").order("started_at", { ascending: false }).limit(10),
      supabase.from("places_external_call_budget").select("calls_used,budget_date").eq("provider", "google_places").eq("budget_date", today).maybeSingle(),
      supabase.from("provider_circuit_state").select("state,kill_switch,last_error_code").eq("provider", "google_places").maybeSingle(),
      supabase.from("system_flags").select("value").eq("key", "DISCOVERY_ENABLED").maybeSingle(),
    ]);

    setRuns((runRes.data ?? []) as unknown as Run[]);
    setBudget({ used: Number((budgetRes.data as { calls_used?: number } | null)?.calls_used ?? 0), limit: 25 });
    const c = circuitRes.data as { state?: string; kill_switch?: boolean; last_error_code?: string | null } | null;
    setCircuit(c ? { state: c.state ?? "?", kill: !!c.kill_switch, error: c.last_error_code ?? null } : null);
    setEnabled(flagRes.data ? Boolean((flagRes.data as { value: unknown }).value) : null);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const runCycle = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("acquisition-discovery-cycle", {
      body: { max_searches: 3, caller: "admin-manual" },
    });
    setRunning(false);
    if (error) {
      toast({ title: "Cycle de découverte", description: "Le cycle est lancé; les résultats apparaissent au rafraîchissement." });
    } else {
      const d = data as Record<string, number>;
      toast({ title: "Découverte terminée", description: `${d?.found ?? 0} fiches, ${d?.inserted ?? 0} nouvelles, ${d?.queued ?? 0} en file.` });
    }
    setTimeout(() => { void load(); }, 4000);
  };

  const last = runs[0] ?? null;
  const todayRuns = runs.filter((r) => new Date(r.started_at).toDateString() === new Date().toDateString());
  const sum = (k: keyof Run) => todayRuns.reduce((a, r) => a + Number(r[k] ?? 0), 0);

  const active = enabled === true && circuit?.kill === false && circuit?.state !== "open";

  return (
    <section className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Radar className="size-5" /> Découverte de nouvelles entreprises
          </h2>
          <Badge variant={active ? "default" : "destructive"}>
            {enabled === null ? "ÉTAT INCONNU" : active ? "DÉCOUVERTE ACTIVE" : "DÉCOUVERTE BLOQUÉE"}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-2 space-y-1">
          <div>Source : Google Places (1 page par recherche, cache 14 jours).</div>
          <div>Plafond : {budget?.used ?? 0}/{budget?.limit ?? 25} appels externes aujourd'hui.</div>
          <div>Coupe-circuit : {circuit ? `${circuit.state}${circuit.kill ? " · arrêt d'urgence" : ""}${circuit.error ? ` · ${circuit.error}` : ""}` : "—"}</div>
          <div>Dernier cycle : {fmt(last?.started_at ?? null)} · Prochain cycle automatique : {nextDiscoveryRun()}</div>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <Button size="sm" onClick={runCycle} disabled={running || !active}>
            {running ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Radar className="size-4 mr-2" />}
            Lancer une découverte
          </Button>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="size-4 mr-2" />Rafraîchir
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-base font-semibold mb-3">Découvertes aujourd'hui</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {([
            ["Recherches", sum("searches_executed")],
            ["Appels Google", sum("external_calls")],
            ["Fiches trouvées", sum("found")],
            ["Nouvelles", sum("inserted")],
            ["Qualifiées", sum("bridged_verified")],
            ["Mises en file", sum("queued")],
          ] as Array<[string, number]>).map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border/60 p-3 min-w-0">
              <div className="text-[11px] text-muted-foreground truncate">{label}</div>
              <div className="text-xl font-bold">{value}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-base font-semibold mb-3">Journal des cycles de découverte</h3>
        <div className="space-y-1 max-h-64 overflow-auto text-xs">
          {runs.length === 0 && <div className="text-muted-foreground">Aucun cycle enregistré.</div>}
          {runs.map((r) => (
            <div key={r.id} className="border-b border-border/30 py-1 flex flex-wrap gap-2">
              <span className="text-muted-foreground">{fmt(r.started_at)}</span>
              <span>{r.trigger_source ?? "—"}</span>
              <span>{r.searches_executed} recherche(s)</span>
              <span className="text-emerald-400">{r.inserted} nouvelles</span>
              <span>{r.queued} en file</span>
              <span className="text-muted-foreground">{r.external_calls} appel(s)</span>
              {r.blocked_reason && <span className="text-red-400 break-all">{r.blocked_reason}</span>}
              <span className="text-muted-foreground">{r.status}</span>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
