/**
 * UNPRO — Admin Execution Control Dashboard
 * Phase 3: Autonomous Engine + Recovery + Agents + Learning
 */
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Shield, Activity, AlertTriangle, Zap, Clock, CheckCircle2,
  PauseCircle, XCircle, SplitSquareVertical, RotateCcw,
  Brain, Gauge, Play, FlaskConical, ChevronRight, Sliders,
  Bot, RefreshCw, TrendingUp, GitBranch, Heart, AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

/* ─── Status helpers ─── */
const STATUS_META: Record<string, { label: string; color: string; icon: typeof Activity }> = {
  pending_evaluation: { label: "En attente", color: "bg-muted text-muted-foreground", icon: Clock },
  pending: { label: "En attente", color: "bg-muted text-muted-foreground", icon: Clock },
  approved: { label: "Approuvé", color: "bg-primary/15 text-primary", icon: CheckCircle2 },
  in_progress: { label: "En cours", color: "bg-blue-500/15 text-blue-400", icon: Activity },
  running: { label: "En cours", color: "bg-blue-500/15 text-blue-400", icon: Activity },
  paused_by_budget_rule: { label: "Pausé", color: "bg-warning/15 text-warning", icon: PauseCircle },
  blocked_by_missing_input: { label: "Bloqué", color: "bg-destructive/15 text-destructive", icon: XCircle },
  split_into_smaller_tasks: { label: "Découpé", color: "bg-secondary/15 text-secondary", icon: SplitSquareVertical },
  partial_success: { label: "Partiel", color: "bg-accent/15 text-accent-foreground", icon: Zap },
  resumed: { label: "Repris", color: "bg-primary/15 text-primary", icon: RotateCcw },
  completed: { label: "Terminé", color: "bg-success/15 text-success", icon: CheckCircle2 },
  abandoned: { label: "Abandonné", color: "bg-destructive/15 text-destructive", icon: XCircle },
  failed: { label: "Échoué", color: "bg-destructive/15 text-destructive", icon: AlertCircle },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || { label: status, color: "bg-muted text-muted-foreground", icon: Activity };
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={`${meta.color} border-0 gap-1 text-[11px]`}>
      <Icon className="h-3 w-3" /> {meta.label}
    </Badge>
  );
}

function WidgetCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string | number; sub?: string; icon: typeof Activity; color: string;
}) {
  return (
    <div className="rounded-2xl border border-border/30 bg-card/60 p-4" style={{ backdropFilter: "blur(10px)" }}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs text-muted-foreground font-medium">{title}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─── Simulation Panel (Phase 2) ─── */
const DEFAULT_SCOPE: Record<string, number> = {
  tables_count: 0, components_count: 0, pages_count: 0, api_calls: 0,
  edge_functions: 0, automation_needed: 0, cron_jobs: 0, image_generation: 0,
  data_volume: 0, dependencies_count: 0,
};
const FACTOR_LABELS: Record<string, string> = {
  tables_count: "Tables", components_count: "Composants", pages_count: "Pages",
  api_calls: "APIs", edge_functions: "Edge Fn", automation_needed: "Automations",
  cron_jobs: "Crons", image_generation: "Images", data_volume: "Données", dependencies_count: "Deps",
};

function PanelSimulation() {
  const [scope, setScope] = useState<Record<string, number>>({ ...DEFAULT_SCOPE });
  const [result, setResult] = useState<any>(null);
  const [decision, setDecision] = useState<any>(null);
  const [splitPlan, setSplitPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const pid = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const h = { "Content-Type": "application/json", apikey: key };

  const simulate = async () => {
    setLoading(true); setResult(null); setDecision(null); setSplitPlan(null);
    try {
      const evalRes = await (await fetch(`https://${pid}.supabase.co/functions/v1/evaluate-task-advanced`, { method: "POST", headers: h, body: JSON.stringify({ scope }) })).json();
      setResult(evalRes);
      const decRes = await (await fetch(`https://${pid}.supabase.co/functions/v1/generate-decision`, { method: "POST", headers: h, body: JSON.stringify({ score: evalRes.advanced_score, credits: evalRes.estimated_credits }) })).json();
      setDecision(decRes);
      if (decRes.action !== "run") {
        const splitRes = await (await fetch(`https://${pid}.supabase.co/functions/v1/generate-split-plan`, { method: "POST", headers: h, body: JSON.stringify({ scope }) })).json();
        setSplitPlan(splitRes);
      }
      toast.success("Simulation terminée");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const actionColors: Record<string, string> = { run: "text-success", split: "text-warning", pause: "text-destructive" };
  const actionLabels: Record<string, string> = { run: "✅ Exécuter", split: "✂️ Découper", pause: "⏸️ Pause" };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/30 bg-card/40 p-5">
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-foreground">Simulateur de tâche</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.keys(DEFAULT_SCOPE).map(k => (
            <div key={k}>
              <Label className="text-[11px] text-muted-foreground">{FACTOR_LABELS[k]}</Label>
              <Input type="number" min={0} max={50} value={scope[k]} onChange={e => setScope({ ...scope, [k]: Number(e.target.value) })} className="h-8 text-sm mt-1" />
            </div>
          ))}
        </div>
        <Button onClick={simulate} disabled={loading} className="mt-4 gap-2" size="sm">
          <Play className="h-3.5 w-3.5" />{loading ? "Simulation..." : "Simuler"}
        </Button>
      </div>
      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="rounded-2xl border border-border/30 bg-card/40 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-foreground">Score</h3>
              <span className={`ml-auto text-2xl font-black ${result.advanced_score > 80 ? "text-destructive" : result.advanced_score > 30 ? "text-warning" : "text-success"}`}>{result.advanced_score}</span>
            </div>
            <div className="space-y-2">
              {Object.entries(result.breakdown || {}).map(([k, v]: [string, any]) => v.count > 0 && (
                <div key={k} className="flex items-center gap-3 text-xs">
                  <span className="w-20 text-muted-foreground truncate">{FACTOR_LABELS[k] || k}</span>
                  <span className="text-foreground font-medium w-6 text-right">{v.count}</span>
                  <span className="text-muted-foreground">×{v.weight}</span>
                  <Progress value={Math.min(100, (v.contribution / Math.max(result.advanced_score, 1)) * 100)} className="flex-1 h-1.5" />
                  <span className="font-bold text-foreground w-8 text-right">{v.contribution}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Crédits:</span>
              <span className="font-bold text-foreground">{result.estimated_credits}</span>
            </div>
          </div>
          {decision && (
            <div className="rounded-2xl border border-border/30 bg-card/40 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sliders className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-foreground">Décision</h3>
              </div>
              <div className={`text-lg font-black mb-1 ${actionColors[decision.action] || ""}`}>{actionLabels[decision.action] || decision.action}</div>
              <p className="text-xs text-muted-foreground">{decision.reason}</p>
              {decision.rule_applied && <Badge variant="outline" className="mt-2 text-[10px]">Règle: {decision.rule_applied}</Badge>}
            </div>
          )}
          {splitPlan && (
            <div className="rounded-2xl border border-border/30 bg-card/40 p-5">
              <div className="flex items-center gap-2 mb-3">
                <SplitSquareVertical className="h-5 w-5 text-primary" /><h3 className="font-bold text-foreground">Plan de découpage</h3>
                <Badge variant="outline" className="ml-auto text-[10px]">{splitPlan.total_estimated_credits} cr.</Badge>
              </div>
              <div className="space-y-2">
                {splitPlan.steps?.map((s: any) => (
                  <div key={s.step} className={`rounded-lg border p-3 flex items-center gap-3 ${s.priority === "critical" ? "border-destructive/30 bg-destructive/5" : s.priority === "high" ? "border-warning/30 bg-warning/5" : "border-muted bg-muted/5"}`}>
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{s.step}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground">{s.type} · {s.priority}</p>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">{s.estimated_credits} cr.</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

/* ─── Agent Activity Panel (Phase 3) ─── */
function PanelAgentActivity() {
  const { data: agentTasks } = useQuery({
    queryKey: ["execution-agent-tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("execution_agent_tasks").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const agentIcons: Record<string, typeof Bot> = {
    execution_runner: Play, task_splitter: GitBranch, recovery_manager: RefreshCw, cost_optimizer: TrendingUp,
  };
  const agentLabels: Record<string, string> = {
    execution_runner: "Runner", task_splitter: "Splitter", recovery_manager: "Recovery", cost_optimizer: "Optimizer",
  };

  const byAgent = (agentTasks || []).reduce<Record<string, any[]>>((acc, t: any) => {
    const k = t.agent_type || "unknown";
    if (!acc[k]) acc[k] = [];
    acc[k].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.keys(byAgent).length === 0 && <p className="text-center text-muted-foreground text-xs py-8">Aucun agent actif</p>}
      {Object.entries(byAgent).map(([agent, tasks]) => {
        const Icon = agentIcons[agent] || Bot;
        const completed = tasks.filter((t: any) => t.status === "completed").length;
        return (
          <div key={agent} className="rounded-2xl border border-border/30 bg-card/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">{agentLabels[agent] || agent}</p>
                <p className="text-[10px] text-muted-foreground">{completed}/{tasks.length} complétées</p>
              </div>
              <Progress value={tasks.length > 0 ? (completed / tasks.length) * 100 : 0} className="ml-auto w-24 h-1.5" />
            </div>
            <div className="space-y-1">
              {tasks.slice(0, 5).map((t: any) => (
                <div key={t.id} className="flex items-center gap-2 text-xs">
                  <StatusBadge status={t.status} />
                  <span className="text-muted-foreground truncate flex-1">{t.task_payload?.label || t.task_payload?.type || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Recovery Panel (Phase 3) ─── */
function PanelRecovery() {
  const { data: recoveries } = useQuery({
    queryKey: ["execution-recovery-memory"],
    queryFn: async () => {
      const { data } = await supabase.from("execution_recovery_memory").select("*").order("created_at", { ascending: false }).limit(30);
      return data || [];
    },
  });

  const strategyColors: Record<string, string> = {
    retry_partial: "bg-blue-500/15 text-blue-400", downgrade_complexity: "bg-warning/15 text-warning",
    split_further: "bg-secondary/15 text-secondary", fallback_version: "bg-accent/15 text-accent-foreground",
    bypass_temporary: "bg-muted text-muted-foreground", mock_data: "bg-primary/15 text-primary",
  };

  return (
    <div className="space-y-3">
      {recoveries?.length === 0 && <p className="text-center text-muted-foreground text-xs py-8">Aucune recovery enregistrée</p>}
      {recoveries?.map((r: any) => (
        <div key={r.id} className="rounded-xl border border-border/30 bg-card/40 p-4">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className={`h-4 w-4 ${r.success ? "text-success" : "text-warning"}`} />
            <span className="font-semibold text-sm text-foreground">{r.failure_type?.replace(/_/g, " ")}</span>
            <Badge variant="outline" className={`ml-auto text-[10px] ${r.success ? "bg-success/15 text-success" : "bg-warning/15 text-warning"} border-0`}>
              {r.success ? "✅ Succès" : `Tentative ${r.retry_count}`}
            </Badge>
          </div>
          <Badge variant="outline" className={`text-[10px] ${strategyColors[r.recovery_strategy] || ""} border-0`}>
            {r.recovery_strategy?.replace(/_/g, " ")}
          </Badge>
        </div>
      ))}
    </div>
  );
}

/* ─── Learning Panel (Phase 3) ─── */
function PanelLearning() {
  const { data: logs } = useQuery({
    queryKey: ["execution-learning-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("execution_learning_logs").select("*").order("updated_at", { ascending: false }).limit(20);
      return data || [];
    },
  });

  return (
    <div className="space-y-3">
      {logs?.length === 0 && <p className="text-center text-muted-foreground text-xs py-8">Aucun apprentissage enregistré — lancez le learning loop</p>}
      {logs?.map((l: any) => {
        const efficiency = l.estimated_credits && l.actual_credits ? Math.round((l.actual_credits / l.estimated_credits) * 100) : null;
        return (
          <div key={l.id} className="rounded-xl border border-border/30 bg-card/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm text-foreground">{l.task_type}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{l.sample_count} samples</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Taux succès</p>
                <p className={`font-bold ${(l.success_rate || 0) >= 0.7 ? "text-success" : "text-warning"}`}>{Math.round((l.success_rate || 0) * 100)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Crédits moy.</p>
                <p className="font-bold text-foreground">{l.actual_credits || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Durée moy.</p>
                <p className="font-bold text-foreground">{l.avg_duration_ms ? `${(l.avg_duration_ms / 1000).toFixed(1)}s` : "—"}</p>
              </div>
              {efficiency != null && (
                <div>
                  <p className="text-muted-foreground">Efficacité coût</p>
                  <p className={`font-bold ${efficiency <= 100 ? "text-success" : "text-destructive"}`}>{efficiency}%</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Config Panels ─── */
function PanelComplexityFactors() {
  const { data: factors } = useQuery({
    queryKey: ["execution-complexity-factors"],
    queryFn: async () => { const { data } = await supabase.from("execution_complexity_factors").select("*").order("weight", { ascending: false }); return data || []; },
  });
  return (
    <div className="rounded-2xl border border-border/30 bg-card/40 p-5">
      <h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><Brain className="h-5 w-5 text-primary" />Facteurs de complexité</h3>
      <div className="space-y-2">
        {factors?.map((f: any) => (
          <div key={f.id} className="flex items-center gap-3 text-sm">
            <Badge variant={f.is_active ? "default" : "outline"} className="text-[10px] w-16 justify-center">×{f.weight}</Badge>
            <span className="text-foreground font-medium flex-1">{f.factor_label}</span>
            <span className="text-muted-foreground text-xs font-mono">{f.factor_key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelDecisionRules() {
  const { data: rules } = useQuery({
    queryKey: ["execution-decision-rules"],
    queryFn: async () => { const { data } = await supabase.from("execution_decision_rules").select("*").order("min_score"); return data || []; },
  });
  const ab: Record<string, string> = { run: "bg-success/15 text-success", split: "bg-warning/15 text-warning", pause: "bg-destructive/15 text-destructive" };
  return (
    <div className="rounded-2xl border border-border/30 bg-card/40 p-5">
      <h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><Sliders className="h-5 w-5 text-primary" />Règles de décision</h3>
      <div className="space-y-3">
        {rules?.map((r: any) => (
          <div key={r.id} className="rounded-lg border border-border/20 p-3 flex items-center gap-3">
            <Badge className={`${ab[r.action] || ""} border-0 text-xs font-bold uppercase`}>{r.action}</Badge>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{r.rule_name}</p>
              <p className="text-[10px] text-muted-foreground">Score {r.min_score}–{r.max_score} · Max {r.max_credit_allowed} cr.</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function PageAdminExecutionControl() {
  const [tab, setTab] = useState("simulation");

  const { data: tasks } = useQuery({
    queryKey: ["execution-tasks"],
    queryFn: async () => { const { data } = await supabase.from("execution_tasks").select("*").order("created_at", { ascending: false }).limit(50); return data || []; },
  });
  const { data: decisions } = useQuery({
    queryKey: ["execution-decisions"],
    queryFn: async () => { const { data } = await supabase.from("execution_decisions").select("*").order("created_at", { ascending: false }).limit(50); return data || []; },
  });
  const { data: agentTasks } = useQuery({
    queryKey: ["execution-agent-tasks-count"],
    queryFn: async () => { const { data } = await supabase.from("execution_agent_tasks").select("status"); return data || []; },
  });
  const { data: recoveries } = useQuery({
    queryKey: ["execution-recovery-count"],
    queryFn: async () => { const { data } = await supabase.from("execution_recovery_memory").select("success"); return data || []; },
  });

  const totalTasks = tasks?.length || 0;
  const activeAgents = agentTasks?.filter((a: any) => a.status === "running").length || 0;
  const recoveryRate = recoveries?.length ? Math.round((recoveries.filter((r: any) => r.success).length / recoveries.length) * 100) : 0;
  const avgScore = totalTasks > 0 ? Math.round((tasks?.reduce((s: number, t: any) => s + (t.advanced_score || t.estimated_complexity_score || 0), 0) || 0) / totalTasks) : 0;

  return (
    <>
      <Helmet><title>Execution Engine — Admin UNPRO</title></Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-1">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Execution Engine</h1>
              <Badge variant="outline" className="text-[10px]">Phase 3 — Autonome</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Auto-split, recovery intelligent, agents, apprentissage continu.</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <WidgetCard title="Tâches" value={totalTasks} icon={Activity} color="bg-primary/10 text-primary" />
            <WidgetCard title="Agents actifs" value={activeAgents} icon={Bot} color="bg-blue-500/10 text-blue-400" />
            <WidgetCard title="Recovery rate" value={`${recoveryRate}%`} icon={Heart} color="bg-success/10 text-success" />
            <WidgetCard title="Score moy." value={avgScore} sub="/100" icon={Brain} color="bg-secondary/10 text-secondary" />
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-muted/40 border border-border/30 rounded-xl flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="simulation" className="rounded-lg text-xs gap-1"><FlaskConical className="h-3 w-3" />Simulation</TabsTrigger>
              <TabsTrigger value="agents" className="rounded-lg text-xs gap-1"><Bot className="h-3 w-3" />Agents</TabsTrigger>
              <TabsTrigger value="recovery" className="rounded-lg text-xs gap-1"><RefreshCw className="h-3 w-3" />Recovery</TabsTrigger>
              <TabsTrigger value="learning" className="rounded-lg text-xs gap-1"><TrendingUp className="h-3 w-3" />Learning</TabsTrigger>
              <TabsTrigger value="tasks" className="rounded-lg text-xs">Tâches</TabsTrigger>
              <TabsTrigger value="decisions" className="rounded-lg text-xs">Décisions</TabsTrigger>
              <TabsTrigger value="config" className="rounded-lg text-xs gap-1"><Sliders className="h-3 w-3" />Config</TabsTrigger>
            </TabsList>

            <TabsContent value="simulation" className="mt-4"><PanelSimulation /></TabsContent>
            <TabsContent value="agents" className="mt-4"><PanelAgentActivity /></TabsContent>
            <TabsContent value="recovery" className="mt-4"><PanelRecovery /></TabsContent>
            <TabsContent value="learning" className="mt-4"><PanelLearning /></TabsContent>

            <TabsContent value="tasks" className="mt-4">
              <div className="rounded-2xl border border-border/30 bg-card/40 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border/20 text-muted-foreground text-xs">
                      <th className="text-left p-3">Tâche</th><th className="text-left p-3">Module</th>
                      <th className="text-center p-3">Score</th><th className="text-center p-3">Ajusté</th>
                      <th className="text-center p-3">Crédits</th><th className="text-center p-3">Statut</th>
                    </tr></thead>
                    <tbody>
                      {tasks?.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-xs">Aucune tâche</td></tr>}
                      {tasks?.map((t: any) => {
                        const sc = t.advanced_score || t.estimated_complexity_score || 0;
                        return (
                          <tr key={t.id} className="border-b border-border/10 hover:bg-muted/5">
                            <td className="p-3 font-medium text-foreground">{t.task_name}</td>
                            <td className="p-3 text-muted-foreground text-xs">{t.module_name || "—"}</td>
                            <td className="p-3 text-center"><span className={`font-bold ${sc > 80 ? "text-destructive" : sc > 30 ? "text-warning" : "text-success"}`}>{sc}</span></td>
                            <td className="p-3 text-center text-xs text-muted-foreground">{t.learning_adjusted_score || "—"}</td>
                            <td className="p-3 text-center text-muted-foreground">{t.estimated_credits || t.estimated_credit_cost || "—"}</td>
                            <td className="p-3 text-center"><StatusBadge status={t.current_status} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="decisions" className="mt-4">
              <div className="space-y-3">
                {decisions?.length === 0 && <p className="text-center text-muted-foreground text-xs py-8">Aucune décision</p>}
                {decisions?.map((d: any) => (
                  <div key={d.id} className="rounded-xl border border-border/30 bg-card/40 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <span className="font-semibold text-sm text-foreground capitalize">{d.decision_type?.replace(/_/g, " ")}</span>
                      {d.score_snapshot != null && <Badge variant="outline" className="ml-auto text-[10px]">Score: {d.score_snapshot}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{d.decision_reason || "—"}</p>
                    <div className="flex gap-2 mt-2">
                      {d.selected_strategy && <Badge variant="outline" className="text-[10px]">{d.selected_strategy}</Badge>}
                      {d.rule_applied && <Badge variant="outline" className="text-[10px]">Règle: {d.rule_applied}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="config" className="mt-4">
              <div className="grid md:grid-cols-2 gap-4"><PanelComplexityFactors /><PanelDecisionRules /></div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
