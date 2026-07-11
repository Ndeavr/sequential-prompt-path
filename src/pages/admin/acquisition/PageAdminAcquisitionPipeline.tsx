import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, CheckCircle2, XCircle, AlertTriangle, Circle, Clock, RefreshCcw, Bug } from "lucide-react";
import { Link } from "react-router-dom";
import {
  useFunnelCounts,
  useLatestAuditRun,
  useRunPipelineAudit,
  type AuditMode,
} from "@/hooks/usePipelineAudit";
import { cn } from "@/lib/utils";

const FUNNEL_STEPS: Array<{ key: keyof ReturnType<typeof useFunnelCounts>["data"] & string; label: string }> = [
  { key: "scraped", label: "Scraped" },
  { key: "contactable", label: "Contactable" },
  { key: "outreach_queued", label: "Outreach queued" },
  { key: "sent", label: "Sent" },
  { key: "delivered", label: "Delivered" },
  { key: "clicked", label: "Clicked" },
  { key: "onboarding_started", label: "Onboarding started" },
  { key: "onboarding_completed", label: "Onboarding completed" },
  { key: "payment_started", label: "Payment started" },
  { key: "paid", label: "Paid" },
  { key: "activated", label: "Activated" },
  { key: "recommendable", label: "Recommendable" },
];

function statusIcon(status: string) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case "failed":
    case "blocked":
      return <XCircle className="w-4 h-4 text-rose-500" />;
    case "skipped":
      return <Circle className="w-4 h-4 text-muted-foreground" />;
    case "pending":
    case "running":
      return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
    default:
      return <Circle className="w-4 h-4 text-muted-foreground" />;
  }
}

export default function PageAdminAcquisitionPipeline() {
  const funnel = useFunnelCounts();
  const latest = useLatestAuditRun();
  const runAudit = useRunPipelineAudit();

  const [mode, setMode] = useState<AuditMode>("simulation");
  const [allowLive, setAllowLive] = useState(false);

  const run = latest.data?.run;
  const steps = (latest.data?.steps ?? []) as Array<{
    step_key: string; step_label: string; status: string; duration_ms: number | null; error_message: string | null;
  }>;

  const total = steps.length;
  const okCount = steps.filter((s) => s.status === "success" || s.status === "skipped").length;
  const failedCount = steps.filter((s) => s.status === "failed" || s.status === "blocked").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline d'acquisition — Cockpit</h1>
          <p className="text-sm text-muted-foreground">
            Scraping → Prospect → Outreach → Onboarding → Paiement → Activation → Alex
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/acquisition/errors">
            <Button variant="outline" size="sm">
              <Bug className="w-4 h-4 mr-2" />
              File d'erreurs
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { funnel.refetch(); latest.refetch(); }}
          >
            <RefreshCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funnel en direct</CardTitle>
          <CardDescription>Compte instantané des étapes du parcours entrepreneur.</CardDescription>
        </CardHeader>
        <CardContent>
          {funnel.isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {FUNNEL_STEPS.map((s, i) => {
                const value = Number(funnel.data?.[s.key] ?? 0);
                const prev = i > 0 ? Number(funnel.data?.[FUNNEL_STEPS[i - 1].key] ?? 0) : null;
                const dropoff = prev !== null && prev > 0 ? Math.round(((prev - value) / prev) * 100) : null;
                return (
                  <div key={s.key} className="rounded-lg border bg-card p-3">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
                    <div className="mt-1 flex items-baseline justify-between gap-2">
                      <div className="text-2xl font-semibold tabular-nums">{value.toLocaleString("fr-CA")}</div>
                      {dropoff !== null && dropoff > 0 && (
                        <div className="text-xs text-rose-500">-{dropoff}%</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test runner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tester tout le pipeline</CardTitle>
          <CardDescription>
            27 étapes end-to-end. Défaut : simulation, aucun envoi réel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as AuditMode)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simulation">Simulation</SelectItem>
                  <SelectItem value="stripe_test">Stripe Test</SelectItem>
                  <SelectItem value="production_no_send">Production (sans envoi)</SelectItem>
                  <SelectItem value="production_live">Production (envoi autorisé)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode === "production_live" && (
              <div className="flex items-center gap-2">
                <Switch id="live" checked={allowLive} onCheckedChange={setAllowLive} />
                <Label htmlFor="live" className="text-xs">
                  Autoriser les envois SMS/email réels
                </Label>
              </div>
            )}
            <Button
              onClick={() => runAudit.mutate({ mode, allow_live_delivery: allowLive })}
              disabled={runAudit.isPending}
            >
              <Play className="w-4 h-4 mr-2" />
              {runAudit.isPending ? "Exécution…" : "Tester tout"}
            </Button>
            {run && (
              <div className="text-xs text-muted-foreground">
                Dernier run : {new Date(run.created_at).toLocaleString("fr-CA")} · mode {run.mode ?? "—"} ·
                {" "}<span className="text-emerald-500 font-medium">{okCount}</span> /
                {" "}<span className="text-rose-500 font-medium">{failedCount}</span> /
                {" "}<span>{total}</span>
              </div>
            )}
          </div>

          {/* Steps list */}
          {latest.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : steps.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Aucun run pour le moment. Lancez « Tester tout » pour démarrer.
            </div>
          ) : (
            <div className="rounded-lg border divide-y">
              {steps.map((s) => (
                <div
                  key={s.step_key}
                  className={cn(
                    "flex items-start gap-3 px-4 py-2.5",
                    (s.status === "failed" || s.status === "blocked") && "bg-rose-500/5",
                    s.status === "warning" && "bg-amber-500/5",
                  )}
                >
                  <div className="pt-0.5">{statusIcon(s.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 justify-between flex-wrap">
                      <div className="font-medium text-sm">{s.step_label}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
                        {s.step_key} · {s.duration_ms ?? 0}ms
                      </div>
                    </div>
                    {s.error_message && (
                      <div className="text-xs text-muted-foreground mt-0.5">{s.error_message}</div>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] uppercase",
                      s.status === "success" && "border-emerald-500/50 text-emerald-500",
                      s.status === "failed" && "border-rose-500/50 text-rose-500",
                      s.status === "blocked" && "border-rose-500/50 text-rose-500",
                      s.status === "warning" && "border-amber-500/50 text-amber-500",
                      s.status === "skipped" && "border-muted-foreground/30 text-muted-foreground",
                    )}
                  >
                    {s.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
