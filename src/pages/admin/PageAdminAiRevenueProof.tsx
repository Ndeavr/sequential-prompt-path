/**
 * UNPRO — /admin/ai-revenue-proof
 * ---------------------------------------------------------------------------
 * L'unique tableau qui répond à une seule question :
 * « Avons-nous une VRAIE conversion payée, attribuable à un agent IA, sans
 *   aucune intervention humaine UNPRO entre la sélection et le paiement ? »
 *
 * Toutes les valeurs proviennent de lignes réelles :
 *  - v_ai_revenue_proof_summary  (entonnoir IA)
 *  - v_ai_revenue_proof          (une ligne par checkout attribué IA)
 *  - ai_agent_runs               (exécutions de l'agent)
 *  - acquisition_events          (chronologie horodatée par jeton)
 * Aucune estimation, aucune projection.
 */
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Bot, ShieldCheck, AlertTriangle, RefreshCw, Play } from "lucide-react";
import { toast } from "sonner";

interface Summary {
  ai_selected: number;
  ai_outreach_sent: number;
  ai_outreach_delivered: number;
  ai_link_clicked: number;
  ai_landing_viewed: number;
  ai_cta_clicked: number;
  ai_checkouts_created: number;
  ai_paid_customers: number;
  ai_revenue_cents: number;
  last_ai_payment_at: string | null;
  ai_runs_total: number;
}

interface ProofRow {
  checkout_id: string;
  stripe_checkout_session_id: string;
  payment_status: string;
  amount_cents: number | null;
  paid_at: string | null;
  checkout_created_at: string;
  activation_token: string | null;
  agent_name: string | null;
  agent_version: string | null;
  agent_mode: string | null;
  agent_dry_run: boolean | null;
  human_unpro_touches: number;
  business_name: string | null;
  city: string | null;
  category: string | null;
  is_test_session: boolean;
  proof_qualified: boolean;
  ai_selected_at: string | null;
  ai_link_clicked_at: string | null;
}

interface RunRow {
  id: string;
  agent_name: string;
  agent_version: string;
  mode: string;
  model: string | null;
  status: string;
  dry_run: boolean;
  candidates_count: number;
  selected_count: number;
  sent_count: number;
  started_at: string;
  finished_at: string | null;
}

interface EventRow {
  event_type: string;
  status: string | null;
  channel: string | null;
  occurred_at: string;
  tracking_id: string | null;
}

const fmtMoney = (cents: number) => `${(cents / 100).toLocaleString("fr-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleString("fr-CA") : "—");

function FunnelRow({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const dead = value === 0;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/30 py-2.5 last:border-0">
      <div>
        <div className="text-sm text-readable">{label}</div>
        {hint && <div className="text-[11px] text-readable-muted">{hint}</div>}
      </div>
      <div className={`tabular-nums text-lg font-bold ${dead ? "text-readable-muted" : "text-readable"}`}>
        {value}
        {dead && <span className="ml-2 rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-normal">0</span>}
      </div>
    </div>
  );
}

export default function PageAdminAiRevenueProof() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<ProofRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [preview, setPreview] = useState<unknown>(null);

  const load = async () => {
    const [s, p, r] = await Promise.all([
      (supabase as any).from("v_ai_revenue_proof_summary").select("*").maybeSingle(),
      (supabase as any).from("v_ai_revenue_proof").select("*").order("checkout_created_at", { ascending: false }).limit(50),
      (supabase as any).from("ai_agent_runs").select("*").order("started_at", { ascending: false }).limit(20),
    ]);
    setSummary((s.data as Summary) ?? null);
    setRows((p.data as ProofRow[]) ?? []);
    setRuns((r.data as RunRow[]) ?? []);

    const tokens = ((p.data as ProofRow[]) ?? []).map((x) => x.activation_token).filter(Boolean) as string[];
    if (tokens.length > 0) {
      const { data: ev } = await (supabase as any)
        .from("acquisition_events")
        .select("event_type,status,channel,occurred_at,tracking_id")
        .in("tracking_id", tokens)
        .order("occurred_at", { ascending: true })
        .limit(300);
      setEvents((ev as EventRow[]) ?? []);
    } else {
      setEvents([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const proven = (summary?.ai_paid_customers ?? 0) > 0;

  const runAgent = async () => {
    setRunning(true);
    setPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-revenue-agent", {
        body: { dry_run: dryRun, limit: 5 },
      });
      if (error) throw new Error(error.message);
      setPreview(data);
      toast.success(dryRun ? "Simulation terminée — aucun envoi." : `Envoi réel : ${(data as any)?.sent ?? 0} message(s).`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'exécution de l'agent.");
    } finally {
      setRunning(false);
    }
  };

  const timelineByToken = useMemo(() => {
    const map: Record<string, EventRow[]> = {};
    for (const e of events) {
      if (!e.tracking_id) continue;
      (map[e.tracking_id] ??= []).push(e);
    }
    return map;
  }, [events]);

  return (
    <div className="admin-theme mx-auto w-full max-w-5xl px-4 py-6">
      <Helmet>
        <title>AI Revenue Proof — UNPRO Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold text-readable">AI Revenue Proof</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Actualiser
        </Button>
      </div>

      {/* Verdict */}
      <div
        className={`mb-5 rounded-2xl border p-5 ${
          proven ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10"
        }`}
      >
        <div className="flex items-start gap-3">
          {proven ? <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-400" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-400" />}
          <div>
            <div className="text-sm font-bold uppercase tracking-wide text-readable">
              {proven ? "PREUVE OBTENUE" : "PREUVE NON OBTENUE"}
            </div>
            <p className="mt-1 text-sm text-readable-body">
              {proven
                ? `${summary?.ai_paid_customers} paiement(s) réel(s) attribuable(s) à un agent IA, sans intervention humaine UNPRO. Dernier paiement : ${fmtDate(summary?.last_ai_payment_at ?? null)}.`
                : "Aucun paiement Stripe réel ne satisfait encore les cinq conditions : origine agent IA, exécution non simulée, jeton d'activation lié, zéro intervention humaine UNPRO, session Stripe de production."}
            </p>
            {proven && (
              <div className="mt-2 text-lg font-bold tabular-nums text-emerald-300">
                {fmtMoney(summary?.ai_revenue_cents ?? 0)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contrôles */}
      <div className="mb-5 rounded-2xl border border-border/30 bg-card/30 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-readable">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
            Mode simulation (aucun envoi)
          </label>
          <Button onClick={runAgent} disabled={running} size="sm">
            {running ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
            {dryRun ? "Simuler une exécution (5)" : "Exécuter réellement (5)"}
          </Button>
          <span className="text-[11px] text-readable-muted">
            L'agent utilise l'expéditeur canonique : toutes les règles CASL, désabonnement et anti-doublon restent actives.
          </span>
        </div>
        {preview != null && (
          <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-black/40 p-3 text-[11px] text-readable-body">
            {JSON.stringify(preview, null, 2)}
          </pre>
        )}
      </div>

      {/* Entonnoir IA réel */}
      <div className="mb-5 rounded-2xl border border-border/30 bg-card/30 p-4">
        <h2 className="mb-2 text-sm font-semibold text-readable">Entonnoir IA (exécutions réelles seulement)</h2>
        {loading ? (
          <div className="py-6 text-center text-sm text-readable-muted">Chargement…</div>
        ) : (
          <>
            <FunnelRow label="Prospects sélectionnés par l'agent" value={summary?.ai_selected ?? 0} />
            <FunnelRow label="Sollicitations envoyées" value={summary?.ai_outreach_sent ?? 0} hint="SMS ou courriel via l'expéditeur canonique" />
            <FunnelRow label="Livrées" value={summary?.ai_outreach_delivered ?? 0} />
            <FunnelRow label="Liens cliqués" value={summary?.ai_link_clicked ?? 0} />
            <FunnelRow label="Pages d'activation vues" value={summary?.ai_landing_viewed ?? 0} />
            <FunnelRow label="Clics sur le bouton de paiement" value={summary?.ai_cta_clicked ?? 0} />
            <FunnelRow label="Checkouts Stripe créés" value={summary?.ai_checkouts_created ?? 0} />
            <FunnelRow label="Paiements confirmés (preuve)" value={summary?.ai_paid_customers ?? 0} />
          </>
        )}
      </div>

      {/* Conversions attribuées */}
      <div className="mb-5 rounded-2xl border border-border/30 bg-card/30 p-4">
        <h2 className="mb-3 text-sm font-semibold text-readable">Checkouts attribués à un agent IA</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-readable-muted">Aucun checkout attribué à un agent pour l'instant.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.checkout_id} className="rounded-xl border border-border/30 bg-background/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium text-readable">
                    {r.business_name ?? "—"} <span className="text-readable-muted">· {r.city ?? "—"} · {r.category ?? "—"}</span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      r.proof_qualified ? "bg-emerald-500/20 text-emerald-300" : "bg-muted/40 text-readable-muted"
                    }`}
                  >
                    {r.proof_qualified ? "PREUVE VALIDE" : "NON QUALIFIÉ"}
                  </span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-readable-muted sm:grid-cols-4">
                  <span>Montant : {fmtMoney(r.amount_cents ?? 0)}</span>
                  <span>Statut : {r.payment_status}</span>
                  <span>Agent : {r.agent_name ?? "—"} {r.agent_version ?? ""}</span>
                  <span>Interventions humaines : {r.human_unpro_touches}</span>
                  <span>Sélection : {fmtDate(r.ai_selected_at)}</span>
                  <span>Clic : {fmtDate(r.ai_link_clicked_at)}</span>
                  <span>Checkout : {fmtDate(r.checkout_created_at)}</span>
                  <span>Payé : {fmtDate(r.paid_at)}</span>
                </div>
                {r.is_test_session && (
                  <div className="mt-1 text-[11px] text-amber-300">Session Stripe de test — exclue de la preuve.</div>
                )}
                {r.activation_token && timelineByToken[r.activation_token] && (
                  <ol className="mt-2 space-y-0.5 border-l border-border/40 pl-3 text-[11px] text-readable-muted">
                    {timelineByToken[r.activation_token].map((e, i) => (
                      <li key={i}>
                        {fmtDate(e.occurred_at)} — {e.event_type}{e.channel ? ` (${e.channel})` : ""}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exécutions */}
      <div className="rounded-2xl border border-border/30 bg-card/30 p-4">
        <h2 className="mb-3 text-sm font-semibold text-readable">Exécutions de l'agent</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-readable-muted">Aucune exécution enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="text-readable-muted">
                <tr>
                  <th className="py-1.5 pr-3">Début</th>
                  <th className="py-1.5 pr-3">Mode</th>
                  <th className="py-1.5 pr-3">Statut</th>
                  <th className="py-1.5 pr-3">Candidats</th>
                  <th className="py-1.5 pr-3">Choisis</th>
                  <th className="py-1.5 pr-3">Envoyés</th>
                </tr>
              </thead>
              <tbody className="text-readable-body">
                {runs.map((r) => (
                  <tr key={r.id} className="border-t border-border/20">
                    <td className="py-1.5 pr-3">{fmtDate(r.started_at)}</td>
                    <td className="py-1.5 pr-3">{r.dry_run ? "simulation" : "réel"}</td>
                    <td className="py-1.5 pr-3">{r.status}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{r.candidates_count}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{r.selected_count}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{r.sent_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
