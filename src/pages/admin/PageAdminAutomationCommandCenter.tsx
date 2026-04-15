import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, AlertTriangle, BarChart3, Bot, CheckCircle2, Clock, Cpu,
  Loader2, Play, RefreshCw, Shield, TrendingUp, Zap, XCircle, RotateCcw, Eye,
} from "lucide-react";
import {
  useCommandCenterMetrics, useBlockers, useActionLogs,
  useResolveBlocker, useDetectBlockers,
} from "@/hooks/useAutomationCommandCenter";
import {
  useAutomationAgents, useAutomationJobs, useToggleAgent, useRunAgent,
} from "@/hooks/useAutomation";
import AutomationAgentTable from "@/components/automation/AutomationAgentTable";
import AutomationJobQueue from "@/components/automation/AutomationJobQueue";
import type { DashboardMetrics, AutomationBlocker, AutomationActionLog } from "@/services/automationCommandCenterService";

// ─── KPI Widget ─────────────────────────────────────────────────
function KpiWidget({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: any; color: string; sub?: string;
}) {
  return (
    <Card className="border-border/40 bg-card/50">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground truncate">{label}</p>
          {sub && <p className="text-[9px] text-muted-foreground/70">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Hourly Chart (simple bar) ──────────────────────────────────
function HourlyChart({ data }: { data: DashboardMetrics["hourly_volume"] }) {
  const max = Math.max(...data.map(d => d.total), 1);
  const currentHour = new Date().getHours();
  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2"><CardTitle className="text-sm">Volume / heure</CardTitle></CardHeader>
      <CardContent className="p-3">
        <div className="flex items-end gap-[2px] h-24">
          {data.map(d => (
            <div key={d.hour} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.hour}h: ${d.total} jobs`}>
              <div className="w-full flex flex-col-reverse gap-[1px]" style={{ height: `${(d.total / max) * 100}%`, minHeight: d.total > 0 ? 4 : 1 }}>
                <div className="bg-emerald-500/80 rounded-t-sm" style={{ height: `${d.total > 0 ? (d.succeeded / d.total) * 100 : 0}%`, minHeight: d.succeeded > 0 ? 2 : 0 }} />
                <div className="bg-destructive/80 rounded-t-sm" style={{ height: `${d.total > 0 ? (d.failed / d.total) * 100 : 0}%`, minHeight: d.failed > 0 ? 2 : 0 }} />
              </div>
              {d.hour === currentHour && <div className="w-1 h-1 rounded-full bg-primary" />}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[8px] text-muted-foreground mt-1">
          <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Engine Distribution ─────────────────────────────────────────
function EngineChart({ data }: { data: DashboardMetrics["by_engine"] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 8);
  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2"><CardTitle className="text-sm">Par moteur</CardTitle></CardHeader>
      <CardContent className="p-3 space-y-1.5">
        {sorted.map(d => (
          <div key={d.engine} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-20 truncate">{d.engine}</span>
            <div className="flex-1 h-3 bg-muted/50 rounded-full overflow-hidden">
              <div className="h-full bg-primary/70 rounded-full" style={{ width: `${(d.count / max) * 100}%` }} />
            </div>
            <span className="text-[10px] font-mono w-6 text-right">{d.count}</span>
          </div>
        ))}
        {sorted.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Aucune donnée</p>}
      </CardContent>
    </Card>
  );
}

// ─── Blockers Table ─────────────────────────────────────────────
function BlockersPanel({ blockers, onResolve }: { blockers: AutomationBlocker[]; onResolve: (id: string, action: "retry" | "ignore" | "resolve") => void }) {
  const severityColor: Record<string, string> = {
    critical: "bg-destructive/10 text-destructive border-destructive/30",
    high: "bg-orange-500/10 text-orange-600 border-orange-500/30",
    medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    low: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  };
  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" /> Blocages actifs ({blockers.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2 max-h-80 overflow-y-auto">
        {blockers.map(b => (
          <div key={b.id} className="p-2.5 rounded-lg border border-border/40 bg-muted/20 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium leading-tight">{b.blocker_title}</p>
                <p className="text-[10px] text-muted-foreground">{b.engine_name} · {b.blocker_type}</p>
              </div>
              <Badge variant="outline" className={`text-[9px] shrink-0 ${severityColor[b.severity_level] ?? ""}`}>
                {b.severity_level}
              </Badge>
            </div>
            {b.blocker_message && <p className="text-[10px] text-muted-foreground">{b.blocker_message}</p>}
            {b.suggested_resolution && <p className="text-[10px] text-primary/80">💡 {b.suggested_resolution}</p>}
            <div className="flex gap-1.5 pt-1">
              {b.retry_possible && (
                <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => onResolve(b.id, "retry")}>
                  <RotateCcw className="h-3 w-3" /> Retry
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => onResolve(b.id, "ignore")}>
                <XCircle className="h-3 w-3" /> Ignorer
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => onResolve(b.id, "resolve")}>
                <CheckCircle2 className="h-3 w-3" /> Résoudre
              </Button>
            </div>
          </div>
        ))}
        {blockers.length === 0 && (
          <div className="text-center py-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Aucun blocage actif</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Action Stream ──────────────────────────────────────────────
function ActionStream({ logs }: { logs: AutomationActionLog[] }) {
  const typeIcon: Record<string, any> = {
    retry: RotateCcw, ignore: XCircle, resolve: CheckCircle2,
    extraction: Cpu, email: Zap, scoring: TrendingUp,
  };
  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Flux d'actions</CardTitle></CardHeader>
      <CardContent className="p-3 space-y-1.5 max-h-64 overflow-y-auto">
        {logs.map(l => {
          const Icon = typeIcon[l.action_type] ?? Zap;
          return (
            <div key={l.id} className="flex items-start gap-2 py-1 border-b border-border/20 last:border-0">
              <Icon className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] leading-tight">{l.action_message ?? l.action_label ?? l.action_type}</p>
                <p className="text-[9px] text-muted-foreground">{l.engine_name} · {new Date(l.created_at).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <Badge variant="outline" className={`text-[8px] shrink-0 ${l.action_status === "completed" ? "text-emerald-600" : "text-amber-600"}`}>
                {l.action_status}
              </Badge>
            </div>
          );
        })}
        {logs.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Aucune action récente</p>}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
const PageAdminAutomationCommandCenter = () => {
  const [jobFilter, setJobFilter] = useState("all");
  const { data: metrics, isLoading: loadingMetrics } = useCommandCenterMetrics();
  const { data: blockers = [] } = useBlockers();
  const { data: actionLogs = [] } = useActionLogs();
  const { data: agents = [] } = useAutomationAgents();
  const { data: jobs = [] } = useAutomationJobs(jobFilter);

  const resolveMut = useResolveBlocker();
  const detectMut = useDetectBlockers();
  const toggleMut = useToggleAgent();
  const runMut = useRunAgent();

  const s = metrics?.summary;

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Centre de Commande
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {s ? `${s.active_agents} agents · ${s.running} en cours · ${s.blocked} bloqués` : "Chargement..."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs rounded-xl" onClick={() => detectMut.mutate()} disabled={detectMut.isPending}>
              {detectMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-3 w-3" />}
              Détecter blocages
            </Button>
          </div>
        </div>

        {/* KPI Grid */}
        {loadingMetrics ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : s ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <KpiWidget label="Jobs aujourd'hui" value={s.total_jobs_today} icon={BarChart3} color="bg-primary/10 text-primary" />
            <KpiWidget label="En cours" value={s.running} icon={Play} color="bg-blue-500/10 text-blue-500" />
            <KpiWidget label="Complétés" value={s.completed} icon={CheckCircle2} color="bg-emerald-500/10 text-emerald-500" />
            <KpiWidget label="Échoués" value={s.failed} icon={XCircle} color="bg-destructive/10 text-destructive" />
            <KpiWidget label="En file" value={s.queued} icon={Clock} color="bg-amber-500/10 text-amber-500" />
            <KpiWidget label="Bloqués" value={s.blocked} icon={AlertTriangle} color="bg-orange-500/10 text-orange-500" />
            <KpiWidget label="Taux succès" value={`${s.success_rate}%`} icon={TrendingUp} color="bg-emerald-500/10 text-emerald-500" />
            <KpiWidget label="Agents actifs" value={`${s.active_agents}/${s.total_agents}`} icon={Bot} color="bg-purple-500/10 text-purple-500" />
          </div>
        ) : null}

        {/* Charts Row */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <HourlyChart data={metrics.hourly_volume} />
            <EngineChart data={metrics.by_engine} />
          </div>
        )}

        {/* Tabs: Blockers, Agents, Jobs, Stream */}
        <Tabs defaultValue="blockers" className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-9 rounded-xl">
            <TabsTrigger value="blockers" className="text-xs gap-1 rounded-lg">
              <AlertTriangle className="h-3 w-3" />
              <span className="hidden sm:inline">Blocages</span>
              <span className="sm:hidden">Block</span>
              {blockers.length > 0 && <span className="ml-1 bg-destructive text-white text-[9px] px-1.5 rounded-full">{blockers.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="agents" className="text-xs gap-1 rounded-lg">
              <Bot className="h-3 w-3" />
              <span className="hidden sm:inline">Agents</span>
              <span className="sm:hidden">Ag.</span>
            </TabsTrigger>
            <TabsTrigger value="jobs" className="text-xs gap-1 rounded-lg">
              <Cpu className="h-3 w-3" />
              Jobs
            </TabsTrigger>
            <TabsTrigger value="stream" className="text-xs gap-1 rounded-lg">
              <Activity className="h-3 w-3" />
              <span className="hidden sm:inline">Stream</span>
              <span className="sm:hidden">Live</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="blockers" className="mt-3">
            <BlockersPanel blockers={blockers} onResolve={(id, action) => resolveMut.mutate({ id, action })} />
          </TabsContent>

          <TabsContent value="agents" className="mt-3">
            <AutomationAgentTable
              agents={agents}
              onToggle={(id, v) => toggleMut.mutate({ id, enabled: v })}
              onRun={(id) => runMut.mutate(id)}
              isRunning={runMut.isPending}
            />
          </TabsContent>

          <TabsContent value="jobs" className="mt-3">
            <AutomationJobQueue
              jobs={jobs}
              statusFilter={jobFilter}
              onFilterChange={setJobFilter}
            />
          </TabsContent>

          <TabsContent value="stream" className="mt-3">
            <ActionStream logs={actionLogs} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default PageAdminAutomationCommandCenter;
