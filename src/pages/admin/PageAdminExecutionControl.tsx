/**
 * UNPRO — Admin Execution Control Dashboard
 * Phase 1: View tasks, runs, decisions, budget rules
 */
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  Shield, Activity, AlertTriangle, Zap, Clock, CheckCircle2,
  PauseCircle, XCircle, SplitSquareVertical, RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

/* ─── Widgets ─── */
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

/* ─── Main ─── */
export default function PageAdminExecutionControl() {
  const [tab, setTab] = useState("tasks");

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

  const { data: rules } = useQuery({
    queryKey: ["execution-budget-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("execution_budget_rules").select("*").order("rule_key");
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
    ? Math.round((tasks?.reduce((s: number, t: any) => s + (t.estimated_complexity_score || 0), 0) || 0) / totalTasks)
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
            </div>
            <p className="text-sm text-muted-foreground">
              Garde-fous, budget, découpage et reprise des tâches de build.
            </p>
          </motion.div>

          {/* Widgets */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <WidgetCard title="Tâches totales" value={totalTasks} icon={Activity} color="bg-primary/10 text-primary" />
            <WidgetCard title="Pausées" value={pausedTasks} icon={PauseCircle} color="bg-warning/10 text-warning" />
            <WidgetCard title="Terminées" value={completedTasks} icon={CheckCircle2} color="bg-success/10 text-success" />
            <WidgetCard title="Complexité moy." value={avgComplexity} sub="/100" icon={Zap} color="bg-secondary/10 text-secondary" />
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="bg-muted/40 border border-border/30 rounded-xl">
              <TabsTrigger value="tasks" className="rounded-lg text-xs">Tâches</TabsTrigger>
              <TabsTrigger value="runs" className="rounded-lg text-xs">Runs</TabsTrigger>
              <TabsTrigger value="decisions" className="rounded-lg text-xs">Décisions</TabsTrigger>
              <TabsTrigger value="rules" className="rounded-lg text-xs">Règles</TabsTrigger>
              <TabsTrigger value="splits" className="rounded-lg text-xs">Splits</TabsTrigger>
            </TabsList>

            {/* Tasks */}
            <TabsContent value="tasks" className="mt-4">
              <div className="rounded-2xl border border-border/30 bg-card/40 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/20 text-muted-foreground text-xs">
                        <th className="text-left p-3">Tâche</th>
                        <th className="text-left p-3">Module</th>
                        <th className="text-center p-3">Complexité</th>
                        <th className="text-center p-3">Crédits est.</th>
                        <th className="text-center p-3">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks?.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-xs">Aucune tâche enregistrée</td></tr>
                      )}
                      {tasks?.map((t: any) => (
                        <tr key={t.id} className="border-b border-border/10 hover:bg-muted/5">
                          <td className="p-3 font-medium text-foreground">{t.task_name}</td>
                          <td className="p-3 text-muted-foreground text-xs">{t.module_name || "—"}</td>
                          <td className="p-3 text-center">
                            <span className={`font-bold ${t.estimated_complexity_score > 80 ? "text-destructive" : t.estimated_complexity_score > 50 ? "text-warning" : "text-success"}`}>
                              {t.estimated_complexity_score}
                            </span>
                          </td>
                          <td className="p-3 text-center text-muted-foreground">{t.estimated_credit_cost}</td>
                          <td className="p-3 text-center"><StatusBadge status={t.current_status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* Runs */}
            <TabsContent value="runs" className="mt-4">
              <div className="rounded-2xl border border-border/30 bg-card/40 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/20 text-muted-foreground text-xs">
                        <th className="text-left p-3">Run</th>
                        <th className="text-center p-3">Type</th>
                        <th className="text-center p-3">Durée</th>
                        <th className="text-center p-3">Crédits</th>
                        <th className="text-center p-3">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs?.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-xs">Aucun run enregistré</td></tr>
                      )}
                      {runs?.map((r: any) => (
                        <tr key={r.id} className="border-b border-border/10 hover:bg-muted/5">
                          <td className="p-3 text-xs text-muted-foreground font-mono">{r.id?.slice(0, 8)}</td>
                          <td className="p-3 text-center text-xs">{r.run_type}</td>
                          <td className="p-3 text-center text-xs">{r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : "—"}</td>
                          <td className="p-3 text-center text-xs">{r.credits_actual || r.credits_estimated || "—"}</td>
                          <td className="p-3 text-center"><StatusBadge status={r.run_status} /></td>
                        </tr>
                      ))}
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
                    </div>
                    <p className="text-xs text-muted-foreground">{d.decision_reason || "—"}</p>
                    {d.selected_strategy && (
                      <Badge variant="outline" className="mt-2 text-[10px]">{d.selected_strategy}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Rules */}
            <TabsContent value="rules" className="mt-4">
              <div className="grid md:grid-cols-3 gap-4">
                {rules?.map((r: any) => (
                  <div key={r.id} className="rounded-xl border border-border/30 bg-card/40 p-4">
                    <h4 className="font-bold text-foreground text-sm mb-2">{r.rule_name}</h4>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <p>Complexité max: <span className="text-foreground font-medium">{r.max_complexity_score}</span></p>
                      <p>Crédits max: <span className="text-foreground font-medium">{r.max_credit_estimate}</span></p>
                      <p>Durée max: <span className="text-foreground font-medium">{r.max_duration_seconds}s</span></p>
                      <div className="flex gap-2 mt-2">
                        {r.auto_pause_enabled && <Badge variant="outline" className="text-[10px]">Auto-pause</Badge>}
                        {r.auto_split_enabled && <Badge variant="outline" className="text-[10px]">Auto-split</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
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
