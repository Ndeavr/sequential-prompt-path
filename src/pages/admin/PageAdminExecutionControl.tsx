/**
 * UNPRO — Admin Execution Control Dashboard
 * Phase 2: Advanced scoring, decision engine, simulation, split preview
 */
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Shield, Activity, AlertTriangle, Zap, Clock, CheckCircle2,
  PauseCircle, XCircle, SplitSquareVertical, RotateCcw,
  Brain, Gauge, Play, FlaskConical, ChevronRight, Sliders,
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
  approved: { label: "Approuvé", color: "bg-primary/15 text-primary", icon: CheckCircle2 },
  in_progress: { label: "En cours", color: "bg-blue-500/15 text-blue-400", icon: Activity },
  paused_by_budget_rule: { label: "Pausé (budget)", color: "bg-warning/15 text-warning", icon: PauseCircle },
  blocked_by_missing_input: { label: "Bloqué", color: "bg-destructive/15 text-destructive", icon: XCircle },
  split_into_smaller_tasks: { label: "Découpé", color: "bg-secondary/15 text-secondary", icon: SplitSquareVertical },
  partial_success: { label: "Partiel", color: "bg-accent/15 text-accent-foreground", icon: Zap },
  resumed: { label: "Repris", color: "bg-primary/15 text-primary", icon: RotateCcw },
  completed: { label: "Terminé", color: "bg-success/15 text-success", icon: CheckCircle2 },
  abandoned: { label: "Abandonné", color: "bg-destructive/15 text-destructive", icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] || { label: status, color: "bg-muted text-muted-foreground", icon: Activity };
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={`${meta.color} border-0 gap-1 text-[11px]`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}

/* ─── Widget ─── */
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

/* ─── Simulation Panel ─── */
const DEFAULT_SCOPE = {
  tables_count: 0, components_count: 0, pages_count: 0,
  api_calls: 0, edge_functions: 0, automation_needed: 0,
  cron_jobs: 0, image_generation: 0, data_volume: 0, dependencies_count: 0,
};

const FACTOR_LABELS: Record<string, string> = {
  tables_count: "Tables", components_count: "Composants", pages_count: "Pages",
  api_calls: "Appels API", edge_functions: "Edge Functions", automation_needed: "Automations",
  cron_jobs: "Cron Jobs", image_generation: "Images", data_volume: "Volume données", dependencies_count: "Dépendances",
};

function PanelSimulation() {
  const [scope, setScope] = useState<Record<string, number>>({ ...DEFAULT_SCOPE });
  const [result, setResult] = useState<any>(null);
  const [decision, setDecision] = useState<any>(null);
  const [splitPlan, setSplitPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const simulate = async () => {
    setLoading(true);
    setResult(null);
    setDecision(null);
    setSplitPlan(null);
    try {
      // Step 1: evaluate
      const evalRes = await fetch(`https://${projectId}.supabase.co/functions/v1/evaluate-task-advanced`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ scope }),
      });
      const evalData = await evalRes.json();
      setResult(evalData);

      // Step 2: decision
      const decRes = await fetch(`https://${projectId}.supabase.co/functions/v1/generate-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ score: evalData.advanced_score, credits: evalData.estimated_credits }),
      });
      const decData = await decRes.json();
      setDecision(decData);

      // Step 3: split plan if action is split or pause
      if (decData.action === "split" || decData.action === "pause") {
        const splitRes = await fetch(`https://${projectId}.supabase.co/functions/v1/generate-split-plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
          body: JSON.stringify({ scope }),
        });
        const splitData = await splitRes.json();
        setSplitPlan(splitData);
      }

      toast.success("Simulation terminée");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const actionColors: Record<string, string> = {
    run: "text-success", split: "text-warning", pause: "text-destructive",
  };
  const actionLabels: Record<string, string> = {
    run: "✅ Exécuter", split: "✂️ Découper", pause: "⏸️ Pause",
  };

  return (
    <div className="space-y-6">
      {/* Scope inputs */}
      <div className="rounded-2xl border border-border/30 bg-card/40 p-5">
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-foreground">Simulateur de tâche</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.keys(DEFAULT_SCOPE).map((key) => (
            <div key={key}>
              <Label className="text-[11px] text-muted-foreground">{FACTOR_LABELS[key] || key}</Label>
              <Input
                type="number" min={0} max={50}
                value={scope[key]}
                onChange={(e) => setScope({ ...scope, [key]: Number(e.target.value) })}
                className="h-8 text-sm mt-1"
              />
            </div>
          ))}
        </div>
        <Button onClick={simulate} disabled={loading} className="mt-4 gap-2" size="sm">
          <Play className="h-3.5 w-3.5" />
          {loading ? "Simulation..." : "Simuler"}
        </Button>
      </div>

      {/* Results */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Score breakdown */}
          <div className="rounded-2xl border border-border/30 bg-card/40 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-foreground">Score de complexité</h3>
              <span className={`ml-auto text-2xl font-black ${result.advanced_score > 80 ? "text-destructive" : result.advanced_score > 30 ? "text-warning" : "text-success"}`}>
                {result.advanced_score}
              </span>
            </div>
            <div className="space-y-2">
              {Object.entries(result.breakdown || {}).map(([key, val]: [string, any]) => (
                val.count > 0 && (
                  <div key={key} className="flex items-center gap-3 text-xs">
                    <span className="w-28 text-muted-foreground">{FACTOR_LABELS[key] || key}</span>
                    <span className="text-foreground font-medium w-8 text-right">{val.count}</span>
                    <span className="text-muted-foreground">× {val.weight}</span>
                    <Progress value={Math.min(100, (val.contribution / Math.max(result.advanced_score, 1)) * 100)} className="flex-1 h-1.5" />
                    <span className="font-bold text-foreground w-10 text-right">{val.contribution}</span>
                  </div>
                )
              ))}
            </div>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Crédits estimés:</span>
                <span className="font-bold text-foreground">{result.estimated_credits}</span>
              </div>
            </div>
          </div>

          {/* Decision */}
          {decision && (
            <div className="rounded-2xl border border-border/30 bg-card/40 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sliders className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-foreground">Décision automatique</h3>
              </div>
              <div className={`text-lg font-black mb-1 ${actionColors[decision.action] || "text-foreground"}`}>
                {actionLabels[decision.action] || decision.action}
              </div>
              <p className="text-xs text-muted-foreground">{decision.reason}</p>
              {decision.rule_applied && (
                <Badge variant="outline" className="mt-2 text-[10px]">Règle: {decision.rule_applied}</Badge>
              )}
            </div>
          )}

          {/* Split plan */}
          {splitPlan && (
            <div className="rounded-2xl border border-border/30 bg-card/40 p-5">
              <div className="flex items-center gap-2 mb-3">
                <SplitSquareVertical className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-foreground">Plan de découpage proposé</h3>
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {splitPlan.total_estimated_credits} crédits total
                </Badge>
              </div>
              <div className="space-y-2">
                {splitPlan.steps?.map((step: any) => {
                  const priorityColors: Record<string, string> = {
                    critical: "border-destructive/30 bg-destructive/5",
                    high: "border-warning/30 bg-warning/5",
                    medium: "border-primary/30 bg-primary/5",
                    low: "border-muted bg-muted/5",
                  };
                  return (
                    <div key={step.step} className={`rounded-lg border p-3 flex items-center gap-3 ${priorityColors[step.priority] || ""}`}>
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        {step.step}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{step.label}</p>
                        <p className="text-[10px] text-muted-foreground">{step.type} · {step.priority}</p>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">{step.estimated_credits} cr.</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

/* ─── Complexity Factors Panel ─── */
function PanelComplexityFactors() {
  const { data: factors } = useQuery({
    queryKey: ["execution-complexity-factors"],
    queryFn: async () => {
      const { data } = await supabase.from("execution_complexity_factors").select("*").order("weight", { ascending: false });
      return data || [];
    },
  });

  return (
    <div className="rounded-2xl border border-border/30 bg-card/40 p-5">
      <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        Facteurs de complexité
      </h3>
      <div className="space-y-2">
        {factors?.map((f: any) => (
          <div key={f.id} className="flex items-center gap-3 text-sm">
            <Badge variant={f.is_active ? "default" : "outline"} className="text-[10px] w-16 justify-center">
              ×{f.weight}
            </Badge>
            <span className="text-foreground font-medium flex-1">{f.factor_label}</span>
            <span className="text-muted-foreground text-xs font-mono">{f.factor_key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Decision Rules Panel ─── */
function PanelDecisionRules() {
  const { data: rules } = useQuery({
    queryKey: ["execution-decision-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("execution_decision_rules").select("*").order("min_score");
      return data || [];
    },
  });

  const actionBadge: Record<string, string> = {
    run: "bg-success/15 text-success",
    split: "bg-warning/15 text-warning",
    pause: "bg-destructive/15 text-destructive",
  };

  return (
    <div className="rounded-2xl border border-border/30 bg-card/40 p-5">
      <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
        <Sliders className="h-5 w-5 text-primary" />
        Règles de décision
      </h3>
      <div className="space-y-3">
        {rules?.map((r: any) => (
          <div key={r.id} className="rounded-lg border border-border/20 p-3 flex items-center gap-3">
            <Badge className={`${actionBadge[r.action] || "bg-muted text-muted-foreground"} border-0 text-xs font-bold uppercase`}>
              {r.action}
            </Badge>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{r.rule_name}</p>
              <p className="text-[10px] text-muted-foreground">Score {r.min_score}–{r.max_score} · Max {r.max_credit_allowed} crédits</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
    queryFn: async () => {
      const { data } = await supabase.from("execution_tasks").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: runs } = useQuery({
    queryKey: ["execution-runs"],
    queryFn: async () => {
      const { data } = await supabase.from("execution_runs").select("*").order("started_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: decisions } = useQuery({
    queryKey: ["execution-decisions"],
    queryFn: async () => {
      const { data } = await supabase.from("execution_decisions").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: splits } = useQuery({
    queryKey: ["execution-split-plans"],
    queryFn: async () => {
      const { data } = await supabase.from("execution_split_plans").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const totalTasks = tasks?.length || 0;
  const pausedTasks = tasks?.filter((t: any) => t.current_status === "paused_by_budget_rule").length || 0;
  const completedTasks = tasks?.filter((t: any) => t.current_status === "completed").length || 0;
  const avgComplexity = totalTasks > 0
    ? Math.round((tasks?.reduce((s: number, t: any) => s + (t.advanced_score || t.estimated_complexity_score || 0), 0) || 0) / totalTasks)
    : 0;

  return (
    <>
      <Helmet>
        <title>Contrôle d'exécution — Admin UNPRO</title>
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3 mb-1">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Contrôle d'exécution</h1>
              <Badge variant="outline" className="text-[10px]">Phase 2 — Intelligence</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Scoring avancé, moteur de décision, simulation et plans de découpage.
            </p>
          </motion.div>

          {/* Widgets */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <WidgetCard title="Tâches totales" value={totalTasks} icon={Activity} color="bg-primary/10 text-primary" />
            <WidgetCard title="Pausées" value={pausedTasks} icon={PauseCircle} color="bg-warning/10 text-warning" />
            <WidgetCard title="Terminées" value={completedTasks} icon={CheckCircle2} color="bg-success/10 text-success" />
            <WidgetCard title="Complexité moy." value={avgComplexity} sub="/100" icon={Brain} color="bg-secondary/10 text-secondary" />
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-muted/40 border border-border/30 rounded-xl flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="simulation" className="rounded-lg text-xs gap-1"><FlaskConical className="h-3 w-3" />Simulation</TabsTrigger>
              <TabsTrigger value="tasks" className="rounded-lg text-xs">Tâches</TabsTrigger>
              <TabsTrigger value="decisions" className="rounded-lg text-xs">Décisions</TabsTrigger>
              <TabsTrigger value="config" className="rounded-lg text-xs gap-1"><Sliders className="h-3 w-3" />Config</TabsTrigger>
              <TabsTrigger value="splits" className="rounded-lg text-xs">Splits</TabsTrigger>
            </TabsList>

            {/* Simulation */}
            <TabsContent value="simulation" className="mt-4">
              <PanelSimulation />
            </TabsContent>

            {/* Tasks */}
            <TabsContent value="tasks" className="mt-4">
              <div className="rounded-2xl border border-border/30 bg-card/40 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/20 text-muted-foreground text-xs">
                        <th className="text-left p-3">Tâche</th>
                        <th className="text-left p-3">Module</th>
                        <th className="text-center p-3">Score</th>
                        <th className="text-center p-3">Crédits</th>
                        <th className="text-center p-3">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks?.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-xs">Aucune tâche enregistrée</td></tr>
                      )}
                      {tasks?.map((t: any) => {
                        const score = t.advanced_score || t.estimated_complexity_score || 0;
                        return (
                          <tr key={t.id} className="border-b border-border/10 hover:bg-muted/5">
                            <td className="p-3 font-medium text-foreground">{t.task_name}</td>
                            <td className="p-3 text-muted-foreground text-xs">{t.module_name || "—"}</td>
                            <td className="p-3 text-center">
                              <span className={`font-bold ${score > 80 ? "text-destructive" : score > 30 ? "text-warning" : "text-success"}`}>
                                {score}
                              </span>
                            </td>
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

            {/* Decisions */}
            <TabsContent value="decisions" className="mt-4">
              <div className="space-y-3">
                {decisions?.length === 0 && (
                  <p className="text-center text-muted-foreground text-xs py-8">Aucune décision enregistrée</p>
                )}
                {decisions?.map((d: any) => (
                  <div key={d.id} className="rounded-xl border border-border/30 bg-card/40 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <span className="font-semibold text-sm text-foreground capitalize">{d.decision_type?.replace(/_/g, " ")}</span>
                      {d.score_snapshot != null && (
                        <Badge variant="outline" className="ml-auto text-[10px]">Score: {d.score_snapshot}</Badge>
                      )}
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

            {/* Config */}
            <TabsContent value="config" className="mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <PanelComplexityFactors />
                <PanelDecisionRules />
              </div>
            </TabsContent>

            {/* Splits */}
            <TabsContent value="splits" className="mt-4">
              <div className="space-y-3">
                {splits?.length === 0 && (
                  <p className="text-center text-muted-foreground text-xs py-8">Aucun plan de découpage</p>
                )}
                {splits?.map((s: any) => {
                  const steps = Array.isArray(s.split_steps_json) ? s.split_steps_json : [];
                  return (
                    <div key={s.id} className="rounded-xl border border-border/30 bg-card/40 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm text-foreground">Split v{s.split_version}</span>
                        <StatusBadge status={s.split_status} />
                      </div>
                      <div className="space-y-1">
                        {steps.map((step: any, i: number) => (
                          <div key={i} className={`text-xs flex items-center gap-2 ${i < (s.current_step_index || 0) ? "text-success" : i === s.current_step_index ? "text-primary font-medium" : "text-muted-foreground"}`}>
                            <span className="w-5 text-right">{i + 1}.</span>
                            <span>{typeof step === "string" ? step : step.label || step.name || JSON.stringify(step)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
