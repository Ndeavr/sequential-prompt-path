/**
 * UNPRO Omega — Founder Command Center
 * Route: /admin/omega
 *
 * The ONLY dashboard the founder needs.
 * All data is REAL (pulled from existing tables via fn-omega-command-center).
 * No mocks. No fake live states. No cosmetic busywork.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  AlertTriangle,
  Activity,
  Sparkles,
  CheckCircle2,
  Clock,
  Zap,
  ShieldAlert,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

type OmegaPayload = {
  generated_at: string;
  header_kpis: {
    revenue_today_cents: number;
    mrr_cents: number;
    paid_contractors_active: number;
    new_paid_this_week: number;
    bookings_today: number;
    critical_alerts: number;
    systems_health_pct: number;
  };
  build_next: Array<{
    id: string;
    title: string;
    description: string;
    agent: string;
    impact_score: number;
    urgency: string;
    execution_mode: string;
    why_now: string | null;
    eta_minutes: number | null;
    proposed_at: string;
  }>;
  running_now: Array<{
    id: string;
    engine: string;
    label: string;
    message: string | null;
    status: string;
    started_at: string;
  }>;
  needs_approval: Array<{
    id: string;
    title: string;
    description: string;
    agent: string;
    impact_score: number;
    urgency: string;
    proposed_at: string;
  }>;
  biggest_leak: {
    title: string;
    message: string | null;
    severity: string;
    engine: string;
    detected_at: string;
  } | null;
};

const fmtMoney = (cents: number) =>
  new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format((cents ?? 0) / 100);

const fmtAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
};

const urgencyColor = (u: string) => {
  switch (u) {
    case "critical":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "high":
      return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "medium":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    default:
      return "bg-muted/30 text-muted-foreground border-border";
  }
};

const PageAdminOmega = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["omega-cockpit"],
    queryFn: async (): Promise<OmegaPayload> => {
      const res = await supabase.functions.invoke("fn-omega-command-center", { body: {} });
      if (res.error) throw res.error;
      return res.data as OmegaPayload;
    },
    refetchInterval: 60_000,
  });

  // Mutations to act on agent_tasks
  const updateTask = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" | "executing" }) => {
      const { error } = await supabase
        .from("agent_tasks")
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast({ title: vars.status === "approved" ? "Approuvé" : vars.status === "executing" ? "Lancement" : "Rejeté" });
      qc.invalidateQueries({ queryKey: ["omega-cockpit"] });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ─── HEADER ─── */}
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              UNPRO OMEGA
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
              Founder Command Center
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Le seul tableau de bord nécessaire. Données réelles, mise à jour automatique.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {/* ─── KPI HEADER ─── */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <KPI icon={<DollarSign />} label="Revenu aujourd'hui" value={fmtMoney(data!.header_kpis.revenue_today_cents)} />
            <KPI icon={<TrendingUp />} label="MRR estimé" value={fmtMoney(data!.header_kpis.mrr_cents)} accent />
            <KPI icon={<Users />} label="Pros actifs payants" value={data!.header_kpis.paid_contractors_active.toString()} />
            <KPI icon={<ArrowUpRight />} label="Nouveaux 7j" value={`+${data!.header_kpis.new_paid_this_week}`} />
            <KPI icon={<Calendar />} label="RDV aujourd'hui" value={data!.header_kpis.bookings_today.toString()} />
            <KPI icon={<AlertTriangle />} label="Alertes critiques" value={data!.header_kpis.critical_alerts.toString()} alert={data!.header_kpis.critical_alerts > 0} />
            <KPI icon={<Activity />} label="Santé systèmes" value={`${data!.header_kpis.systems_health_pct}%`} accent={data!.header_kpis.systems_health_pct >= 90} alert={data!.header_kpis.systems_health_pct < 70} />
          </div>
        )}

        {/* ─── BIGGEST LEAK ─── */}
        {data?.biggest_leak && (
          <Card className="border-red-500/30 bg-gradient-to-br from-red-500/5 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-red-400">
                    <ShieldAlert className="h-4 w-4" />
                    Biggest leak right now
                  </div>
                  <CardTitle className="mt-1 text-lg">{data.biggest_leak.title}</CardTitle>
                </div>
                <Badge variant="destructive">{data.biggest_leak.severity}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {data.biggest_leak.message && <p className="text-sm text-muted-foreground mb-3">{data.biggest_leak.message}</p>}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{data.biggest_leak.engine} · détecté {fmtAgo(data.biggest_leak.detected_at)}</span>
                <Button size="sm" variant="destructive">Fix Now</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* ─── BUILD NEXT ─── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Here's what we should build next
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">AI-RANKED</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)
              ) : data!.build_next.length === 0 ? (
                <EmptyState message="Aucune tâche proposée. L'orchestrateur scanne…" />
              ) : (
                data!.build_next.map((t, idx) => (
                  <div key={t.id} className="rounded-lg border bg-card/50 p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-sm font-semibold">{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-sm">{t.title}</h4>
                          <Badge variant="outline" className={urgencyColor(t.urgency)}>{t.urgency}</Badge>
                        </div>
                        {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                          <span>Impact {t.impact_score}/100</span>
                          {t.eta_minutes && <span>· {t.eta_minutes} min</span>}
                          <span>· {t.agent}</span>
                        </div>
                        {t.why_now && <p className="text-[11px] text-primary/80 mt-1">⚡ {t.why_now}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="h-7 text-xs" onClick={() => updateTask.mutate({ id: t.id, status: "executing" })}>Approve & Run</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateTask.mutate({ id: t.id, status: "approved" })}>Run Tonight</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateTask.mutate({ id: t.id, status: "rejected" })}>Reject</Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* ─── RUNNING NOW ─── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-emerald-400" />
                Autonomous actions running now
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)
              ) : data!.running_now.length === 0 ? (
                <EmptyState message="Aucune action autonome en cours." />
              ) : (
                data!.running_now.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 rounded-lg border bg-card/30 p-3">
                    <div className="mt-0.5">
                      {r.status === "running" ? (
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{r.label}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{fmtAgo(r.started_at)}</span>
                      </div>
                      {r.message && <p className="text-xs text-muted-foreground truncate">{r.message}</p>}
                      <span className="text-[10px] text-muted-foreground">{r.engine}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── NEEDS APPROVAL ─── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4 text-amber-400" />
                Needs your approval
              </CardTitle>
              <Badge variant="outline">{data?.needs_approval.length ?? 0} en attente</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24" />
            ) : data!.needs_approval.length === 0 ? (
              <EmptyState message="Rien ne nécessite votre approbation. Tout roule." />
            ) : (
              <div className="space-y-2">
                {data!.needs_approval.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card/30 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={urgencyColor(t.urgency)}>{t.urgency}</Badge>
                        <span className="text-sm font-medium truncate">{t.title}</span>
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground mt-1 truncate">{t.description}</p>}
                      <span className="text-[10px] text-muted-foreground">{t.agent} · proposé {fmtAgo(t.proposed_at)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs" onClick={() => updateTask.mutate({ id: t.id, status: "approved" })}>Approuver</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => updateTask.mutate({ id: t.id, status: "rejected" })}>Rejeter</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground">
          Données réelles · pas de mocks · généré {data ? fmtAgo(data.generated_at) : "…"}
        </p>
      </div>
    </AdminLayout>
  );
};

const KPI = ({
  icon,
  label,
  value,
  accent,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
  alert?: boolean;
}) => (
  <div
    className={`rounded-lg border p-3 transition-colors ${
      alert
        ? "border-red-500/40 bg-red-500/5"
        : accent
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card/40"
    }`}
  >
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
      <span className="h-3 w-3 [&>svg]:h-3 [&>svg]:w-3">{icon}</span>
      {label}
    </div>
    <div className="mt-1 text-xl font-bold">{value}</div>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-lg border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground">
    {message}
  </div>
);

export default PageAdminOmega;
