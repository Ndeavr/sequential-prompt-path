/**
 * UNPRO — Launch War Room (admin only).
 * /admin/launch-war-room — single source of truth pour le mode lancement autonome.
 *
 * Surfaces: secret readiness, current objective + stage + trade + city + lead,
 * active blocker banner, discovery diagnostics, live event stream, pipeline counts.
 */
import { useLaunchWarRoom } from "@/hooks/useLaunchWarRoom";
import { setLaunchMode } from "@/lib/launch/founderMode";
import { LAUNCH_STATES, STATE_LABELS, type LaunchState } from "@/lib/launch/stateMachine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, Trophy, Rocket, AlertOctagon, CheckCircle2, XCircle, Copy } from "lucide-react";
import { TruthPanel } from "@/components/admin/launch/TruthPanel";
import { AgentHealthTable } from "@/components/admin/launch/AgentHealthTable";

function fmtCents(c?: number) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format((c ?? 0) / 100);
}

function timeSince(iso?: string | null): string {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  return `${Math.floor(s / 3600)}h`;
}

export default function AdminLaunchWarRoom() {
  const { data, isLoading, refetch } = useLaunchWarRoom();
  const { toast } = useToast();

  const handleStart = async () => {
    await setLaunchMode("launching");
    toast({ title: "🚀 Lancement activé", description: "Le Commander dispatch chaque minute." });
    refetch();
  };
  const handlePause = async () => {
    await setLaunchMode("paused");
    toast({ title: "⏸ Lancement en pause" });
    refetch();
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Chargement…</div>;
  const s = data?.state;
  const mode = s?.mode ?? "idle";
  const acquired = mode === "first_customer_acquired";
  const readiness = data?.readiness;
  const startDisabled = !!readiness && !readiness.ready;

  const blockerRecent = s?.last_blocker_at &&
    Date.now() - new Date(s.last_blocker_at).getTime() < 5 * 60 * 1000;

  return (
    <div className="admin-theme">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-readable-strong">Launch War Room</h1>
            <p className="text-sm text-readable-muted mt-1">Objectif unique : premier contractor payant.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={
              acquired ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-sm px-3 py-1" :
              mode === "launching" ? "bg-blue-500/15 text-blue-300 border-blue-500/30 text-sm px-3 py-1" :
              mode === "paused" ? "bg-amber-500/15 text-amber-300 border-amber-500/30 text-sm px-3 py-1" :
              "bg-muted text-muted-foreground text-sm px-3 py-1"
            }>
              {acquired ? "🎉 FIRST CUSTOMER ACQUIRED" : mode === "launching" ? "🚀 LAUNCHING" : mode === "paused" ? "⏸ PAUSED" : "IDLE"}
            </Badge>
            {!acquired && mode !== "launching" && (
              <Button onClick={handleStart} disabled={startDisabled} className="gap-2">
                <Rocket className="w-4 h-4" /> START LAUNCH
              </Button>
            )}
            {mode === "launching" && (
              <Button onClick={handlePause} variant="outline" className="gap-2"><Pause className="w-4 h-4" /> Pause</Button>
            )}
            {mode === "paused" && (
              <Button onClick={handleStart} disabled={startDisabled} className="gap-2"><Play className="w-4 h-4" /> Reprendre</Button>
            )}
          </div>
        </div>

        {/* Active blocker banner */}
        {blockerRecent && s?.last_blocker_reason && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-red-300 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-red-200">
                Blocage actif — {s.last_blocker_agent ?? "agent inconnu"} <span className="text-red-300/70 font-normal">il y a {timeSince(s.last_blocker_at)}</span>
              </div>
              <div className="text-sm text-red-100/90 mt-1 font-mono break-words">{s.last_blocker_reason}</div>
            </div>
            <Button
              size="sm" variant="outline"
              onClick={() => { navigator.clipboard.writeText(s.last_blocker_reason ?? ""); toast({ title: "Copié" }); }}
              className="gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" /> Copier
            </Button>
          </div>
        )}

        {/* Secrets readiness */}
        {readiness && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Secrets {readiness.ready
                  ? <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Tous configurés</Badge>
                  : <Badge className="bg-red-500/20 text-red-300 border-red-500/30">{readiness.missingCritical.length} manquants</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {Object.entries(readiness.status).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 rounded-md border border-border/30 bg-muted/10 px-2.5 py-1.5">
                  {v ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                  <span className="font-mono truncate">{k}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <TruthPanel
          funnel={data?.funnel ?? null}
          pendingCheckouts={data?.pendingCheckouts ?? 0}
          oldestPendingAgeMin={data?.oldestPendingAgeMin ?? null}
        />

        <AgentHealthTable rows={data?.agentHealth ?? []} />

        {acquired && s && (
          <Card className="border-emerald-500/40 bg-emerald-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-300">
                <Trophy className="w-5 h-5" /> Premier client acquis
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><div className="text-xs text-readable-muted">Date</div><div>{s.first_customer_acquired_at?.slice(0,16).replace("T"," ")}</div></div>
              <div><div className="text-xs text-readable-muted">Plan</div><div>{s.first_customer_plan ?? "—"}</div></div>
              <div><div className="text-xs text-readable-muted">Source</div><div>{s.first_customer_source ?? "—"}</div></div>
              <div><div className="text-xs text-readable-muted">Revenu</div><div className="text-emerald-300 font-semibold">{fmtCents(s.first_customer_revenue_cents)}</div></div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Revenu" value={fmtCents(data?.revenueCents)} tone="ok" />
          <Kpi label="Leads totaux" value={String(data?.totalLeads ?? 0)} />
          <Kpi label="Réponses" value={String(data?.replies ?? 0)} />
          <Kpi label="Activations" value={String(data?.byStatus.ACTIVATED ?? 0)} tone="ok" />
        </div>

        {/* Current objective */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Objectif courant</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Field label="Objectif" value={s?.current_objective_label ?? "Premier client payant"} />
            <Field label="Étape" value={s?.current_stage_label ?? "—"} />
            <Field label="Métier" value={s?.current_trade ?? "—"} />
            <Field label="Ville" value={s?.current_city ?? "—"} />
            <Field label="Dernier succès" value={s?.last_success_description ?? "—"} sub={s?.last_success_at ? `il y a ${timeSince(s.last_success_at)}` : ""} />
            <Field label="Cap quotidien email" value={String(s?.daily_email_cap ?? 25)} />
            <Field label="Cap quotidien SMS" value={String(s?.daily_sms_cap ?? 50)} />
            <Field label="Founder Mode" value={s?.founder_mode_enabled ? "Actif" : "Inactif"} />
          </CardContent>
        </Card>

        {/* Discovery diagnostics */}
        {data?.lastScoutPayload && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Diagnostic découverte</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
              <Diag label="Insérés" value={String(data.lastScoutPayload.count ?? data.lastScoutPayload.inserted ?? 0)} tone="ok" />
              <Diag label="Sans contact" value={String(data.lastScoutPayload.rejection?.no_phone_no_email ?? 0)} />
              <Diag label="Hors territoire" value={String(data.lastScoutPayload.rejection?.outside_territory ?? 0)} />
              <Diag label="Doublons" value={String(data.lastScoutPayload.rejection?.duplicate ?? 0)} />
              <Diag label="Refill Places" value={String(data.lastScoutPayload.refill?.inserted_into_pool ?? 0)} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Pipeline</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {LAUNCH_STATES.map(st => (
              <div key={st} className="rounded-lg border border-border/40 bg-muted/10 p-3">
                <div className="text-[10px] uppercase tracking-wide text-readable-muted">{STATE_LABELS[st as LaunchState]}</div>
                <div className="text-2xl font-bold tabular-nums">{data?.byStatus[st] ?? 0}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Live event stream */}
        <Card>
          <CardHeader><CardTitle className="text-base">Flux d'événements (temps réel)</CardTitle></CardHeader>
          <CardContent className="max-h-[480px] overflow-y-auto space-y-1 text-xs">
            {data?.events.map((e: any) => {
              const failed = e.success === false || e.event === "blocked" || e.event === "failed";
              return (
                <div
                  key={e.id}
                  className={`flex items-start gap-2 py-1.5 px-2 rounded border-l-2 ${
                    failed ? "border-red-500/60 bg-red-500/5" :
                    e.success === true ? "border-emerald-500/40 bg-emerald-500/5" :
                    "border-border/40"
                  }`}
                >
                  <span className="text-readable-muted tabular-nums w-20 shrink-0">{e.created_at?.slice(11,19)}</span>
                  <span className="font-mono text-[10px] text-blue-300 w-44 shrink-0 truncate">{e.agent}</span>
                  <span className={`font-medium w-28 shrink-0 ${failed ? "text-red-300" : "text-readable-body"}`}>{e.event}</span>
                  {e.from_state && e.to_state && (
                    <span className="text-readable-muted w-32 shrink-0">{e.from_state} → {e.to_state}</span>
                  )}
                  {e.message && (
                    <span className={`flex-1 min-w-0 truncate ${failed ? "text-red-200" : "text-readable-secondary"}`}>
                      {e.message}
                    </span>
                  )}
                  {failed && e.message && (
                    <Button
                      size="sm" variant="ghost"
                      className="h-5 px-1.5 text-[10px]"
                      onClick={() => { navigator.clipboard.writeText(e.message); toast({ title: "Copié" }); }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              );
            }) ?? <div className="text-readable-muted">Aucun événement.</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "ok" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-readable-muted uppercase tracking-wide">{label}</div>
        <div className={`text-2xl font-bold tabular-nums mt-1 ${tone === "ok" ? "text-emerald-300" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-readable-muted">{label}</div>
      <div className="text-readable-body font-medium mt-0.5 truncate">{value}</div>
      {sub && <div className="text-[11px] text-readable-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function Diag({ label, value, tone }: { label: string; value: string; tone?: "ok" }) {
  return (
    <div className="rounded-md border border-border/40 bg-muted/10 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-readable-muted">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${tone === "ok" ? "text-emerald-300" : ""}`}>{value}</div>
    </div>
  );
}
