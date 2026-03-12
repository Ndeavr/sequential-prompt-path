import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, CheckCircle2, AlertTriangle, XCircle, Info, Clock, Bug, Eye,
  ChevronRight, Shield, Sparkles, BarChart3, ListTodo, ArrowUpDown,
  RefreshCw, Check, Filter, Loader2
} from "lucide-react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";
import {
  useValidationRuns, useValidationFindings, usePageScores,
  useImprovementTasks, useLaunchValidation, useResolveFind, useUpdateTaskStatus,
} from "@/hooks/useValidation";

const severityConfig: Record<string, { icon: typeof XCircle; color: string; bg: string; label: string }> = {
  critical: { icon: XCircle, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", label: "Critique" },
  high: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "Élevée" },
  medium: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", label: "Moyenne" },
  low: { icon: Info, color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20", label: "Faible" },
  info: { icon: Info, color: "text-slate-500", bg: "bg-slate-500/10 border-slate-500/20", label: "Info" },
};

const priorityColors: Record<string, string> = {
  p0: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  p1: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  p2: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  p3: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-slate-400 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div className={`h-full rounded-full ${color}`} initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.6 }} />
      </div>
      <span className="text-xs font-mono font-bold w-8 text-right" style={{ color: score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444" }}>{score}</span>
    </div>
  );
}

export default function AdminValidation() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");

  const { data: runs, isLoading: runsLoading } = useValidationRuns();
  const { data: findings } = useValidationFindings(selectedRunId);
  const { data: pageScores } = usePageScores(selectedRunId);
  const { data: tasks } = useImprovementTasks(selectedRunId);
  const launchMutation = useLaunchValidation();
  const resolveMutation = useResolveFind();
  const updateTaskMutation = useUpdateTaskStatus();

  const selectedRun = runs?.find(r => r.id === selectedRunId);

  const filteredFindings = findings?.filter(f => {
    if (severityFilter !== "all" && f.severity !== severityFilter) return false;
    if (agentFilter !== "all" && f.agent !== agentFilter) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-4 md:p-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Shield className="w-7 h-7 text-violet-400" />
              Validation Autonome
            </h1>
            <p className="text-slate-400 text-sm mt-1">Agent Q (QA) + Agent I (UX/UI) — Audit complet de la plateforme</p>
          </div>
          <Button
            onClick={() => launchMutation.mutate()}
            disabled={launchMutation.isPending}
            className="bg-violet-600 hover:bg-violet-500 text-white border-0 gap-2"
          >
            {launchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {launchMutation.isPending ? "Validation en cours…" : "Lancer la validation"}
          </Button>
        </motion.div>

        {/* Run History */}
        {runs && runs.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-slate-400 mb-3">Historique des validations</h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {runs.map((run) => (
                <button
                  key={run.id}
                  onClick={() => setSelectedRunId(run.id)}
                  className={`shrink-0 px-4 py-3 rounded-xl border text-left transition-all ${
                    selectedRunId === run.id
                      ? "bg-violet-500/10 border-violet-500/30"
                      : "bg-white/[0.03] border-white/5 hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs">
                    {run.status === "completed" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> :
                     run.status === "running" ? <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" /> :
                     <Clock className="w-3.5 h-3.5 text-slate-400" />}
                    <span className="font-medium">{new Date(run.created_at).toLocaleDateString("fr-CA")}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px]">
                    {run.critical_count > 0 && <span className="text-rose-400">{run.critical_count} crit</span>}
                    {run.high_count > 0 && <span className="text-amber-400">{run.high_count} high</span>}
                    <span className="text-slate-500">{run.pages_scanned} pages</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Run Content */}
        {selectedRun && (
          <Tabs defaultValue="summary" className="space-y-6">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="summary" className="gap-1.5"><Sparkles className="w-3.5 h-3.5" />Résumé</TabsTrigger>
              <TabsTrigger value="findings" className="gap-1.5"><Bug className="w-3.5 h-3.5" />Anomalies ({findings?.length || 0})</TabsTrigger>
              <TabsTrigger value="scores" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Scores</TabsTrigger>
              <TabsTrigger value="backlog" className="gap-1.5"><ListTodo className="w-3.5 h-3.5" />Backlog ({tasks?.length || 0})</TabsTrigger>
            </TabsList>

            {/* ── Summary ── */}
            <TabsContent value="summary">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Critiques", value: selectedRun.critical_count, color: "text-rose-400", bg: "bg-rose-500/10" },
                  { label: "Élevées", value: selectedRun.high_count, color: "text-amber-400", bg: "bg-amber-500/10" },
                  { label: "Moyennes", value: selectedRun.medium_count, color: "text-blue-400", bg: "bg-blue-500/10" },
                  { label: "Faibles", value: selectedRun.low_count, color: "text-slate-400", bg: "bg-slate-500/10" },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl ${s.bg} border border-white/5 p-4 text-center`}>
                    <div className="text-[10px] text-slate-500 uppercase">{s.label}</div>
                    <div className={`text-3xl font-display font-bold ${s.color} mt-1`}>{s.value}</div>
                  </div>
                ))}
              </div>

              {selectedRun.status === "running" && (
                <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-4 mb-6">
                  <div className="flex items-center gap-2 text-sm text-violet-300 mb-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Validation en cours…
                  </div>
                  <Progress value={((selectedRun.pages_scanned || 0) / (selectedRun.total_pages || 1)) * 100} className="h-2" />
                  <div className="text-xs text-slate-400 mt-1">{selectedRun.pages_scanned}/{selectedRun.total_pages} pages analysées</div>
                </div>
              )}

              {selectedRun.executive_summary && (
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-400" /> Rapport exécutif
                  </h3>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{selectedRun.executive_summary}</ReactMarkdown>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── Findings ── */}
            <TabsContent value="findings">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Filter className="w-4 h-4 text-slate-500" />
                {["all", "critical", "high", "medium", "low"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeverityFilter(s)}
                    className={`px-3 py-1 rounded-full text-xs border transition ${severityFilter === s ? "bg-violet-500/20 border-violet-500/30 text-violet-300" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"}`}
                  >
                    {s === "all" ? "Toutes" : severityConfig[s]?.label}
                  </button>
                ))}
                <div className="w-px h-4 bg-white/10" />
                {["all", "agent_q", "agent_i"].map((a) => (
                  <button
                    key={a}
                    onClick={() => setAgentFilter(a)}
                    className={`px-3 py-1 rounded-full text-xs border transition ${agentFilter === a ? "bg-blue-500/20 border-blue-500/30 text-blue-300" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"}`}
                  >
                    {a === "all" ? "Tous agents" : a === "agent_q" ? "Agent Q" : "Agent I"}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {filteredFindings?.map((f) => {
                  const cfg = severityConfig[f.severity] || severityConfig.info;
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-xl border p-4 ${f.is_resolved ? "opacity-50" : ""} ${cfg.bg}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${cfg.color}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{f.title}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {f.agent === "agent_q" ? "QA" : "UX"}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{f.category}</Badge>
                              {f.page_route && <span className="text-[10px] text-slate-500 font-mono">{f.page_route}</span>}
                            </div>
                            <p className="text-xs text-slate-300 mt-1">{f.description}</p>
                            {f.suggested_fix && (
                              <p className="text-xs text-emerald-400/80 mt-1.5">💡 {f.suggested_fix}</p>
                            )}
                          </div>
                        </div>
                        {!f.is_resolved && (
                          <Button
                            size="sm" variant="ghost"
                            className="shrink-0 text-xs text-slate-400 hover:text-emerald-400"
                            onClick={() => resolveMutation.mutate(f.id)}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                {filteredFindings?.length === 0 && (
                  <div className="text-center py-12 text-slate-500 text-sm">Aucune anomalie trouvée avec ces filtres.</div>
                )}
              </div>
            </TabsContent>

            {/* ── Page Scores ── */}
            <TabsContent value="scores">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pageScores?.map((ps) => (
                  <motion.div
                    key={ps.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-xl bg-white/[0.03] border border-white/5 p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-semibold text-sm">{ps.page_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{ps.page_route}</div>
                      </div>
                      <div
                        className="text-2xl font-display font-bold"
                        style={{ color: ps.overall_score >= 80 ? "#10b981" : ps.overall_score >= 60 ? "#f59e0b" : "#ef4444" }}
                      >
                        {ps.overall_score}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <ScoreBar label="Clarté" score={ps.clarity_score} />
                      <ScoreBar label="Navigation" score={ps.navigation_score} />
                      <ScoreBar label="CTA" score={ps.cta_score} />
                      <ScoreBar label="Confiance" score={ps.trust_score} />
                      <ScoreBar label="Visuel" score={ps.visual_score} />
                      <ScoreBar label="Images" score={ps.image_score} />
                      <ScoreBar label="Mobile" score={ps.mobile_score} />
                    </div>
                    {(ps.weaknesses as string[])?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <div className="text-[10px] text-slate-500 uppercase mb-1">Faiblesses</div>
                        <ul className="text-xs text-slate-400 space-y-0.5">
                          {(ps.weaknesses as string[]).slice(0, 3).map((w, i) => (
                            <li key={i} className="flex items-start gap-1"><span className="text-rose-400">•</span>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            {/* ── Backlog ── */}
            <TabsContent value="backlog">
              <div className="space-y-2">
                {tasks?.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <Badge className={`text-[10px] border ${priorityColors[t.priority] || priorityColors.p3}`}>{t.priority.toUpperCase()}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{t.title}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2">
                        <span>{t.category}</span>
                        {t.page_route && <span className="font-mono">{t.page_route}</span>}
                      </div>
                    </div>
                    <select
                      value={t.status}
                      onChange={(e) => updateTaskMutation.mutate({ id: t.id, status: e.target.value })}
                      className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-slate-300"
                    >
                      <option value="backlog">Backlog</option>
                      <option value="todo">À faire</option>
                      <option value="in_progress">En cours</option>
                      <option value="done">Terminé</option>
                      <option value="wont_fix">Won't fix</option>
                    </select>
                  </div>
                ))}
                {tasks?.length === 0 && (
                  <div className="text-center py-12 text-slate-500 text-sm">Aucune tâche d'amélioration générée.</div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Empty state */}
        {!selectedRunId && !runsLoading && (
          <div className="text-center py-24">
            <Shield className="w-16 h-16 text-violet-500/30 mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold mb-2">Aucune validation encore</h2>
            <p className="text-slate-400 text-sm mb-6">Lancez votre première validation pour auditer toutes les pages de la plateforme.</p>
            <Button
              onClick={() => launchMutation.mutate()}
              disabled={launchMutation.isPending}
              className="bg-violet-600 hover:bg-violet-500 text-white border-0 gap-2"
            >
              {launchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Lancer la première validation
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
