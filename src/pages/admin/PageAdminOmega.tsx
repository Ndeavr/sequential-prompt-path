/**
 * UNPRO Omega — Founder Dashboard V3 LIVE
 * Route: /admin/omega
 *
 * 100% live data. Every KPI is clickable → trust drawer (source / formula / counts).
 * Approve & Run actually invokes fn-omega-execute-task.
 * Live ticker auto-refreshes every 15s.
 * Honest empty states — never fabricated.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp, DollarSign, Users, Calendar, AlertTriangle, Activity,
  Sparkles, ShieldAlert, RefreshCw, Zap, Bot, Target,
  Radio, Brain, Home as HomeIcon, ListChecks, Info,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────
type TrustEntry = { source_table: string; formula: string; raw_count: number; last_updated: string; notes: string | null };
type PipelineStep = { label: string; value: number; source: string; warn?: boolean };

type OmegaPayload = {
  generated_at: string;
  status_color: "green" | "amber" | "red";
  header_kpis: {
    revenue_today_cents: number; mrr_cents: number;
    paid_contractors_active: number; new_paid_this_week: number;
    bookings_today: number; critical_alerts: number; systems_health_pct: number;
  };
  todays_command: null | {
    id: string; title: string; description: string; agent: string; agent_key: string | null;
    impact_score: number; urgency: string; execution_mode: string;
    why_now: string | null; eta_minutes: number | null;
    estimated_revenue_cents: number | null; confidence_pct: number;
    proposed_at: string; source: string;
  };
  money_grid: {
    revenue_today: { value_cents: number; trend: number[] };
    mrr: { value_cents: number; trend: number[] };
    paid_pros: { value: number; trend: number[] };
    bookings_today: { value: number; trend: number[] };
  };
  trust: Record<string, TrustEntry>;
  biggest_leak: null | { title: string; message: string | null; severity: string; engine: string; detected_at: string };
  opportunity: null | { source: string; title: string; message: string; potential_cents: number | null; action_label: string; is_estimated: boolean };
  agents_overnight: Array<{ ts: string; agent: string; message: string; type: string }>;
  needs_approval: Array<{ id: string; title: string; description: string; agent: string; urgency: string; proposed_at: string; estimated_revenue_cents: number | null }>;
  subsystem_health: Array<{ key: string; label: string; pct: number; checks: number }>;
  weekly_targets: Array<{ key: string; label: string; target: number; progress: number; source: string }>;
  forecast: { next_7d_revenue_cents: number; confidence_pct: number; is_estimated: boolean; baseline_label: string };
  live_ticker: Array<{ ts: string; label: string; kind: string; source: string }>;
  running_now: Array<{ id: string; engine: string; label: string; message: string | null; status: string; started_at: string }>;
  build_next: Array<{ id: string; title: string; description: string; agent: string; impact_score: number; urgency: string; execution_mode: string; why_now: string | null; eta_minutes: number | null; proposed_at: string }>;
  process_pipeline: { revenue: PipelineStep[]; booking: PipelineStep[]; alex: PipelineStep[] };
  data_state: {
    has_payments: boolean; has_bookings: boolean; has_funnel_signal: boolean;
    has_alex_activity: boolean; has_health_checks: boolean; orphaned_subs: number;
  };
};

// ─── Formatters ───────────────────────────────────────────────────
const fmtMoney = (cents: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format((cents ?? 0) / 100);
const fmtMoneyShort = (cents: number) => {
  const v = (cents ?? 0) / 100;
  if (v === 0) return "$0";
  if (v >= 1000) return `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return `$${Math.round(v)}`;
};
const fmtAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
};
const statusDot = (s: "green" | "amber" | "red") => ({
  green: "bg-emerald-400 shadow-[0_0_12px_hsl(142_76%_56%/0.6)]",
  amber: "bg-amber-400 shadow-[0_0_12px_hsl(45_96%_56%/0.6)]",
  red: "bg-red-500 shadow-[0_0_12px_hsl(0_84%_60%/0.6)]",
}[s]);
const statusLabel = (s: "green" | "amber" | "red") =>
  ({ green: "Croissance", amber: "Surveillance", red: "Urgent" }[s]);

// ─── Sparkline ────────────────────────────────────────────────────
const Sparkline = ({ data, accent = "primary" }: { data: number[]; accent?: "primary" | "emerald" }) => {
  if (!data?.length || data.every(v => v === 0)) {
    return <span className="text-[9px] text-muted-foreground/60">—</span>;
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 60, h = 16;
  const points = data.map((v, i) => `${(i / (data.length - 1 || 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  const stroke = accent === "emerald" ? "hsl(142, 76%, 56%)" : "hsl(var(--primary))";
  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ─── Page ─────────────────────────────────────────────────────────
const PageAdminOmega = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showV3, setShowV3] = useState(false);
  const [trustOpen, setTrustOpen] = useState<{ key: string; label: string } | null>(null);
  const [pipelineOpen, setPipelineOpen] = useState<"revenue" | "booking" | "alex" | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["omega-cockpit"],
    queryFn: async (): Promise<OmegaPayload> => {
      const res = await supabase.functions.invoke("fn-omega-command-center", { body: {} });
      if (res.error) throw res.error;
      return res.data as OmegaPayload;
    },
    refetchInterval: 15_000, // Live ticker spec: refresh every 15s
  });

  const executeTask = useMutation({
    mutationFn: async ({ id, mode }: { id: string; mode: "approve" | "execute" | "reject" }) => {
      const res = await supabase.functions.invoke("fn-omega-execute-task", {
        body: { task_id: id, mode },
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: (d, vars) => {
      const labels = { approve: "Approuvé", execute: "Lancement", reject: "Rejeté" };
      toast({
        title: labels[vars.mode],
        description: d?.invocation?.fn ? `Agent: ${d.invocation.fn}` : undefined,
      });
      qc.invalidateQueries({ queryKey: ["omega-cockpit"] });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const status = data?.status_color ?? "amber";
  const trustEntry = trustOpen && data?.trust ? data.trust[trustOpen.key] : null;
  const pipeline = pipelineOpen && data?.process_pipeline ? data.process_pipeline[pipelineOpen] : null;

  return (
    <div className="min-h-screen bg-[#060B14] text-foreground pb-24">
      {/* ─── Sticky thin top bar ─── */}
      <div className="sticky top-0 z-40 border-b border-white/5 bg-[#060B14]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-foreground/90">Unpro Omega · Live</span>
          </div>
          <button onClick={() => refetch()} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
            <span className={`h-1.5 w-1.5 rounded-full ${statusDot(status)}`} />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{statusLabel(status)}</span>
          </button>
          <Link to="/admin" className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-foreground/80">
            <Activity className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {/* ─── V2 / V3 toggle ─── */}
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => setShowV3(false)}
            className={`flex-1 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all ${!showV3 ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground"}`}
          >
            Command
          </button>
          <button
            onClick={() => setShowV3(true)}
            className={`flex-1 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all ${showV3 ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground"}`}
          >
            <Brain className="mr-1 inline h-3 w-3" />Intelligence
          </button>
        </div>

        {isLoading || !data ? (
          <div className="space-y-4">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        ) : (
          <>
            {/* Honest data state banner */}
            {!data.data_state.has_payments && !data.data_state.has_bookings && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-300/90">
                Tracking actif. Aucun paiement ni RDV aujourd'hui — les compteurs commenceront dès la première activité.
              </div>
            )}
            {data.data_state.orphaned_subs > 0 && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] text-red-300/90">
                ⚠️ {data.data_state.orphaned_subs} abonnement(s) avec plan_id orphelin (aucune correspondance dans plan_catalog). MRR sous-estimé.
              </div>
            )}

            {/* ───────────── V3 INTELLIGENCE LAYER ───────────── */}
            {showV3 && (
              <>
                <GlassCard accent>
                  <Eyebrow icon={<Brain className="h-3 w-3" />} label="Prévision 7 jours" tag="Estimé" />
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <div className="text-4xl font-bold tracking-tight">+{fmtMoney(data.forecast.next_7d_revenue_cents)}</div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Confiance</div>
                      <div className={`text-lg font-semibold ${data.forecast.confidence_pct >= 60 ? "text-emerald-400" : data.forecast.confidence_pct >= 30 ? "text-amber-400" : "text-muted-foreground"}`}>
                        {data.forecast.confidence_pct}%
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{data.forecast.baseline_label}</p>
                </GlassCard>

                <GlassCard>
                  <div className="flex items-center justify-between">
                    <Eyebrow icon={<Radio className="h-3 w-3 text-emerald-400" />} label="Live ticker" />
                    <span className="text-[9px] text-muted-foreground">Refresh 15s</span>
                  </div>
                  <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                    {data.live_ticker.length === 0 ? (
                      <Empty msg="Aucun événement ces 24h. Le flux apparaîtra dès la première action." />
                    ) : data.live_ticker.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 border-b border-white/5 pb-2 last:border-0">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          t.kind === "failed" ? "bg-red-400" :
                          t.kind === "running" ? "bg-amber-400 animate-pulse" :
                          t.kind === "completed" ? "bg-emerald-400" :
                          "bg-primary/60"
                        }`} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs">{t.label}</div>
                          <div className="text-[9px] text-muted-foreground">{t.source}</div>
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{fmtAgo(t.ts)}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </>
            )}

            {/* ───────────── V2 COMMAND LAYER ───────────── */}
            {!showV3 && (
              <>
                {/* 1 — Today's Command Hero */}
                <GlassCard accent className="relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
                  <Eyebrow icon={<Zap className="h-3 w-3 text-primary" />} label="Today's command" />
                  {data.todays_command ? (
                    <>
                      <h2 className="mt-2 text-xl font-bold leading-tight">{data.todays_command.title}</h2>
                      {data.todays_command.description && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{data.todays_command.description}</p>
                      )}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {data.todays_command.estimated_revenue_cents != null && (
                          <Stat label="Impact estimé" value={`+${fmtMoneyShort(data.todays_command.estimated_revenue_cents)}`} accent="emerald" tag="Estimé" />
                        )}
                        <Stat label="Confiance" value={`${Math.round(data.todays_command.confidence_pct)}%`} />
                        {data.todays_command.eta_minutes && (
                          <Stat label="Temps" value={`${data.todays_command.eta_minutes} min`} />
                        )}
                        <Stat label="Urgence" value={data.todays_command.urgency} />
                      </div>
                      {data.todays_command.why_now && (
                        <p className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-primary/90">
                          ⚡ {data.todays_command.why_now}
                        </p>
                      )}
                      <div className="mt-2 text-[9px] text-muted-foreground">Source: {data.todays_command.source}</div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                          disabled={executeTask.isPending}
                          onClick={() => executeTask.mutate({ id: data.todays_command!.id, mode: "execute" })}
                        >
                          {executeTask.isPending ? "Lancement..." : "Approve & Run"}
                        </Button>
                        <Button
                          variant="outline" className="border-white/15 bg-white/5"
                          onClick={() => executeTask.mutate({ id: data.todays_command!.id, mode: "reject" })}
                        >
                          Skip
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Empty msg="Aucune mission proposée. Les agents génèrent les prochaines actions." />
                  )}
                </GlassCard>

                {/* 2 — Money Now grid (clickable for trust) */}
                <GlassCard>
                  <Eyebrow icon={<DollarSign className="h-3 w-3" />} label="Money now · tap pour la source" />
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <MoneyTile
                      label="Revenu aujourd'hui" value={fmtMoneyShort(data.money_grid.revenue_today.value_cents)}
                      trend={data.money_grid.revenue_today.trend}
                      onClick={() => setTrustOpen({ key: "revenue_today", label: "Revenu aujourd'hui" })}
                    />
                    <MoneyTile
                      label="MRR" value={fmtMoneyShort(data.money_grid.mrr.value_cents)}
                      trend={data.money_grid.mrr.trend} accent
                      onClick={() => setTrustOpen({ key: "mrr", label: "MRR" })}
                    />
                    <MoneyTile
                      label="Pros payants" value={data.money_grid.paid_pros.value.toString()}
                      trend={data.money_grid.paid_pros.trend} icon={<Users className="h-3 w-3" />}
                      onClick={() => setTrustOpen({ key: "paid_pros", label: "Pros payants" })}
                    />
                    <MoneyTile
                      label="RDV aujourd'hui" value={data.money_grid.bookings_today.value.toString()}
                      trend={data.money_grid.bookings_today.trend} icon={<Calendar className="h-3 w-3" />}
                      onClick={() => setTrustOpen({ key: "bookings_today", label: "RDV aujourd'hui" })}
                    />
                  </div>
                  {/* Process pipelines drilldown */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <PipelineLink onClick={() => setPipelineOpen("revenue")} label="Revenu" />
                    <PipelineLink onClick={() => setPipelineOpen("booking")} label="RDV" />
                    <PipelineLink onClick={() => setPipelineOpen("alex")} label="Alex" />
                  </div>
                </GlassCard>

                {/* 3 — Leak Alert */}
                {data.biggest_leak ? (
                  <GlassCard className="border-red-500/30 bg-gradient-to-br from-red-500/10 via-transparent to-transparent">
                    <Eyebrow icon={<ShieldAlert className="h-3 w-3 text-red-400" />} label="Leak alert" tone="red" />
                    <h3 className="mt-2 text-lg font-bold leading-tight">{data.biggest_leak.title}</h3>
                    {data.biggest_leak.message && <p className="mt-1 text-xs text-muted-foreground">{data.biggest_leak.message}</p>}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{data.biggest_leak.engine} · {fmtAgo(data.biggest_leak.detected_at)}</span>
                      <Link to="/admin/blockers"><Button size="sm" variant="destructive">Investiguer</Button></Link>
                    </div>
                  </GlassCard>
                ) : (
                  <GlassCard className="border-emerald-500/15">
                    <Eyebrow icon={<ShieldAlert className="h-3 w-3 text-emerald-400" />} label="Aucune fuite critique" tone="emerald" />
                    <p className="mt-2 text-xs text-muted-foreground">Tous les blockers critiques sont résolus.</p>
                  </GlassCard>
                )}

                {/* 4 — Opportunity Detected */}
                {data.opportunity && (
                  <GlassCard className="border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent">
                    <Eyebrow icon={<Target className="h-3 w-3 text-emerald-400" />} label="Opportunité détectée" tag={data.opportunity.is_estimated ? "Estimé" : undefined} tone="emerald" />
                    <h3 className="mt-2 text-lg font-bold capitalize leading-tight">{data.opportunity.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{data.opportunity.message}</p>
                    {data.opportunity.potential_cents != null && data.opportunity.potential_cents > 0 && (
                      <div className="mt-3 text-sm">
                        <span className="text-muted-foreground">Potentiel: </span>
                        <span className="font-semibold text-emerald-400">+{fmtMoneyShort(data.opportunity.potential_cents)}/mois</span>
                      </div>
                    )}
                    <div className="mt-2 text-[9px] text-muted-foreground">Source: {data.opportunity.source}</div>
                  </GlassCard>
                )}

                {/* 5 — Agents Overnight */}
                <GlassCard>
                  <div className="flex items-center justify-between">
                    <Eyebrow icon={<Bot className="h-3 w-3" />} label="Agents · 24h" />
                    <Link to="/admin/agents" className="text-[10px] uppercase tracking-wider text-primary">Tous →</Link>
                  </div>
                  <div className="mt-3 space-y-2">
                    {data.agents_overnight.length === 0 ? (
                      <Empty msg="Aucune activité agent ces 24h." />
                    ) : data.agents_overnight.slice(0, 6).map((a, i) => (
                      <div key={i} className="flex items-start gap-3 border-b border-white/5 pb-2 last:border-0">
                        <div className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                          a.type === "failed" ? "bg-red-400" :
                          a.type === "running" ? "bg-amber-400" :
                          "bg-primary/70"
                        }`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-foreground/90">{a.message}</p>
                          <span className="text-[10px] text-muted-foreground">{a.agent} · {fmtAgo(a.ts)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* 6 — Needs Approval */}
                <GlassCard>
                  <Eyebrow icon={<ListChecks className="h-3 w-3 text-amber-400" />} label="Needs your approval" />
                  <div className="mt-3 space-y-2">
                    {data.needs_approval.length === 0 ? (
                      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-center">
                        <p className="text-sm font-medium text-foreground/90">Aucune approbation requise.</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Le système avance.</p>
                      </div>
                    ) : data.needs_approval.map(t => (
                      <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-tight">{t.title}</p>
                            {t.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{t.description}</p>}
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                              <Badge variant="outline" className="h-4 border-amber-500/30 bg-amber-500/10 px-1.5 text-[9px] text-amber-400">{t.urgency}</Badge>
                              <span>{t.agent}</span>
                              {t.estimated_revenue_cents != null && t.estimated_revenue_cents > 0 && (
                                <span className="text-emerald-400">+{fmtMoneyShort(t.estimated_revenue_cents)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Button
                            size="sm" className="h-7 flex-1 text-xs"
                            disabled={executeTask.isPending}
                            onClick={() => executeTask.mutate({ id: t.id, mode: "execute" })}
                          >Approve & Run</Button>
                          <Button
                            size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                            disabled={executeTask.isPending}
                            onClick={() => executeTask.mutate({ id: t.id, mode: "reject" })}
                          >Rejeter</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* 7 — Subsystem Health */}
                <GlassCard>
                  <Eyebrow icon={<Activity className="h-3 w-3" />} label="Subsystem health · 1h" />
                  <div className="mt-3 space-y-3">
                    {data.subsystem_health.map(s => (
                      <div key={s.key}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-foreground/85">{s.label}</span>
                          <span className={s.checks === 0 ? "text-muted-foreground" : s.pct >= 90 ? "text-emerald-400" : s.pct >= 60 ? "text-amber-400" : "text-red-400"}>
                            {s.checks === 0 ? "—" : `${s.pct}% (${s.checks})`}
                          </span>
                        </div>
                        <Progress value={s.pct} className="h-1.5 bg-white/5" />
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[10px] text-muted-foreground">«—» = aucun health check récent. Pas de fake 100%.</p>
                </GlassCard>

                {/* 8 — This Week Target */}
                <GlassCard>
                  <Eyebrow icon={<Target className="h-3 w-3" />} label="This week target" />
                  <div className="mt-3 space-y-3">
                    {data.weekly_targets.map(t => {
                      const pct = Math.min(100, Math.round((t.progress / Math.max(1, t.target)) * 100));
                      return (
                        <div key={t.key}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-foreground/85">{t.label}</span>
                            <span className="font-semibold">{t.progress} / {t.target}</span>
                          </div>
                          <Progress value={pct} className="h-1.5 bg-white/5" />
                          <div className="mt-0.5 text-[9px] text-muted-foreground">{t.source}</div>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              </>
            )}

            <p className="pt-2 text-center text-[10px] text-muted-foreground">
              Données réelles · {fmtAgo(data.generated_at)}
              {isRefetching && <RefreshCw className="ml-1 inline h-3 w-3 animate-spin" />}
            </p>
          </>
        )}
      </div>

      {/* ─── Bottom Nav ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-[#060B14]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-2.5">
          <BottomNavItem to="/admin/omega" icon={<HomeIcon className="h-4 w-4" />} label="Omega" active />
          <BottomNavItem to="/admin/revenue" icon={<DollarSign className="h-4 w-4" />} label="Revenue" />
          <BottomNavItem to="/alex" icon={<Sparkles className="h-4 w-4" />} label="Alex" />
          <BottomNavItem to="/admin/agents" icon={<Bot className="h-4 w-4" />} label="Agents" />
          <BottomNavItem to="/admin" icon={<Activity className="h-4 w-4" />} label="Admin" />
        </div>
      </div>

      {/* ─── Trust Drilldown Drawer ─── */}
      <Sheet open={!!trustOpen} onOpenChange={(o) => !o && setTrustOpen(null)}>
        <SheetContent side="bottom" className="bg-[#0A1220] border-white/10">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-foreground">
              <Info className="h-4 w-4 text-primary" />
              {trustOpen?.label}
            </SheetTitle>
            <SheetDescription className="text-muted-foreground">D'où vient ce nombre ?</SheetDescription>
          </SheetHeader>
          {trustEntry && (
            <div className="mt-4 space-y-3 text-sm">
              <TrustRow label="Source" value={<code className="rounded bg-white/5 px-2 py-0.5 text-xs">{trustEntry.source_table}</code>} />
              <TrustRow label="Formule" value={<code className="rounded bg-white/5 px-2 py-0.5 text-xs">{trustEntry.formula}</code>} />
              <TrustRow label="Lignes brutes" value={<span className="font-bold">{trustEntry.raw_count}</span>} />
              <TrustRow label="Mis à jour" value={fmtAgo(trustEntry.last_updated)} />
              {trustEntry.notes && (
                <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300/90">
                  ⚠️ {trustEntry.notes}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ─── Process Pipeline Drawer ─── */}
      <Sheet open={!!pipelineOpen} onOpenChange={(o) => !o && setPipelineOpen(null)}>
        <SheetContent side="bottom" className="bg-[#0A1220] border-white/10">
          <SheetHeader>
            <SheetTitle className="capitalize text-foreground">
              Pipeline · {pipelineOpen}
            </SheetTitle>
            <SheetDescription className="text-muted-foreground">Étapes réelles du tunnel.</SheetDescription>
          </SheetHeader>
          {pipeline && (
            <div className="mt-4 space-y-2">
              {pipeline.map((step, i) => (
                <div key={i} className={`flex items-center justify-between rounded-lg border p-3 ${step.warn ? "border-red-500/30 bg-red-500/5" : "border-white/10 bg-white/[0.02]"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{step.label}</div>
                    <div className="text-[10px] text-muted-foreground">{step.source}</div>
                  </div>
                  <div className={`text-2xl font-bold ${step.warn ? "text-red-400" : "text-foreground"}`}>{step.value}</div>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Omega Autonomous Loop — daily conductor + lifecycle engines */}
      <div className="mt-6">
        <OmegaLoopSection />
      </div>
    </div>
  );
};

// ─── Subcomponents ────────────────────────────────────────────────
const GlassCard = ({ children, className = "", accent = false }: { children: React.ReactNode; className?: string; accent?: boolean }) => (
  <div className={`rounded-2xl border ${accent ? "border-primary/20 bg-gradient-to-br from-primary/[0.06] via-white/[0.02] to-transparent" : "border-white/10 bg-white/[0.03]"} p-4 backdrop-blur-md ${className}`}>
    {children}
  </div>
);

const Eyebrow = ({ icon, label, tag, tone }: { icon: React.ReactNode; label: string; tag?: string; tone?: "red" | "emerald" }) => (
  <div className="flex items-center justify-between">
    <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${tone === "red" ? "text-red-400" : tone === "emerald" ? "text-emerald-400" : "text-muted-foreground"}`}>
      {icon}{label}
    </div>
    {tag && <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">{tag}</span>}
  </div>
);

const Stat = ({ label, value, accent, tag }: { label: string; value: string; accent?: "emerald"; tag?: string }) => (
  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
    <div className="flex items-center justify-between">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {tag && <span className="text-[8px] text-muted-foreground">{tag}</span>}
    </div>
    <div className={`mt-0.5 text-base font-bold ${accent === "emerald" ? "text-emerald-400" : "text-foreground"}`}>{value}</div>
  </div>
);

const MoneyTile = ({ label, value, trend, accent, icon, onClick }: { label: string; value: string; trend: number[]; accent?: boolean; icon?: React.ReactNode; onClick?: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-left rounded-xl border p-3 transition-all hover:scale-[1.01] hover:border-primary/40 ${accent ? "border-primary/30 bg-primary/[0.06]" : "border-white/10 bg-white/[0.02]"}`}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        {icon}{label}
      </div>
      <Sparkline data={trend} accent={accent ? "primary" : "emerald"} />
    </div>
    <div className={`mt-1 text-2xl font-bold tracking-tight ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
  </button>
);

const PipelineLink = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button
    onClick={onClick}
    className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
  >
    Pipeline {label} →
  </button>
);

const TrustRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-2">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-right">{value}</span>
  </div>
);

const Empty = ({ msg }: { msg: string }) => (
  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-4 text-center text-xs text-muted-foreground">
    {msg}
  </div>
);

const BottomNavItem = ({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active?: boolean }) => (
  <Link to={to} className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
    {icon}
    <span className="text-[9px] font-medium uppercase tracking-wider">{label}</span>
  </Link>
);

export default PageAdminOmega;
