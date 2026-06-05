/**
 * UNPRO — Launch War Room (admin only).
 * /admin/launch-war-room — single source of truth pour le mode lancement autonome.
 */
import { useLaunchWarRoom } from "@/hooks/useLaunchWarRoom";
import { setLaunchMode } from "@/lib/launch/founderMode";
import { LAUNCH_STATES, STATE_LABELS, type LaunchState } from "@/lib/launch/stateMachine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, Trophy, Rocket } from "lucide-react";

function fmtCents(c?: number) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format((c ?? 0) / 100);
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

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Launch War Room</h1>
          <p className="text-sm text-muted-foreground mt-1">Objectif unique : premier contractor payant.</p>
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
            <Button onClick={handleStart} className="gap-2"><Rocket className="w-4 h-4" /> START LAUNCH</Button>
          )}
          {mode === "launching" && (
            <Button onClick={handlePause} variant="outline" className="gap-2"><Pause className="w-4 h-4" /> Pause</Button>
          )}
          {mode === "paused" && (
            <Button onClick={handleStart} className="gap-2"><Play className="w-4 h-4" /> Reprendre</Button>
          )}
        </div>
      </div>

      {acquired && s && (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-300">
              <Trophy className="w-5 h-5" /> Premier client acquis
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><div className="text-xs text-muted-foreground">Date</div><div>{s.first_customer_acquired_at?.slice(0,16).replace("T"," ")}</div></div>
            <div><div className="text-xs text-muted-foreground">Plan</div><div>{s.first_customer_plan ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Source</div><div>{s.first_customer_source ?? "—"}</div></div>
            <div><div className="text-xs text-muted-foreground">Revenu</div><div className="text-emerald-300 font-semibold">{fmtCents(s.first_customer_revenue_cents)}</div></div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Revenu" value={fmtCents(data?.revenueCents)} tone="ok" />
        <Kpi label="Leads totaux" value={String(data?.totalLeads ?? 0)} />
        <Kpi label="Réponses" value={String(data?.replies ?? 0)} />
        <Kpi label="Activations" value={String(data?.byStatus.ACTIVATED ?? 0)} tone="ok" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Pipeline</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {LAUNCH_STATES.map(st => (
            <div key={st} className="rounded-lg border border-border/40 bg-muted/10 p-3">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{STATE_LABELS[st as LaunchState]}</div>
              <div className="text-2xl font-bold tabular-nums">{data?.byStatus[st] ?? 0}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Timeline (50 derniers événements)</CardTitle></CardHeader>
        <CardContent className="max-h-[420px] overflow-y-auto space-y-1.5 text-xs">
          {data?.events.map((e: any) => (
            <div key={e.id} className="flex items-start gap-2 py-1 border-b border-border/20">
              <span className="text-muted-foreground tabular-nums w-32 shrink-0">{e.created_at?.slice(11,19)}</span>
              <span className="font-mono text-[10px] text-blue-300 w-44 shrink-0 truncate">{e.agent}</span>
              <span className={e.success ? "text-foreground" : "text-red-300"}>{e.event}</span>
              {e.from_state && e.to_state && (
                <span className="text-muted-foreground">{e.from_state} → {e.to_state}</span>
              )}
              {e.message && <span className="text-muted-foreground truncate">— {e.message}</span>}
            </div>
          )) ?? <div className="text-muted-foreground">Aucun événement.</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "ok" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className={`text-2xl font-bold tabular-nums mt-1 ${tone === "ok" ? "text-emerald-300" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
