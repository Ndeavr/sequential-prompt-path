import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  AlertTriangle, TrendingUp, Sparkles, ChevronRight, Clock,
  Users, ArrowLeft, Star, BadgeCheck, Wrench, DollarSign, Zap, Target,
  CalendarClock, ShieldCheck, BarChart3, Rocket, RefreshCw, Send,
  CheckCircle2, Award, ArrowUpDown
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useSyndicate, useCapexForecasts } from "@/hooks/useSyndicate";
import { useSyndicateProjects, useRunGrowthScan, useAIRecommendations, useCompleteProject, useMarketBenchmarks } from "@/hooks/useGrowthEngine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AlexGlobalOrb from "@/components/alex/AlexGlobalOrb";
import { toast } from "sonner";

/* ── Animation ── */
const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
});

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 ${className}`}>{children}</div>
);

/* ── Mock fallback data ── */
const MOCK_PROJECTS = [
  { id: "1", component: "Toiture", title: "Remplacement membrane de toiture", estimated_cost: 210000, estimated_year: 2029, priority: "critical", status: "detected", remaining_life_years: 4, risk_score: 85, matched_contractor_count: 6, actual_cost: null, cost_variance_percent: null, ai_prediction_accuracy: null, completed_at: null, owner_rating: null, owner_feedback: null },
  { id: "2", component: "Fenêtres", title: "Remplacement fenêtres thermos", estimated_cost: 145000, estimated_year: 2033, priority: "high", status: "planning", remaining_life_years: 7, risk_score: 62, matched_contractor_count: 4, actual_cost: null, cost_variance_percent: null, ai_prediction_accuracy: null, completed_at: null, owner_rating: null, owner_feedback: null },
  { id: "3", component: "Maçonnerie", title: "Réparations joints de maçonnerie", estimated_cost: 95000, estimated_year: 2037, priority: "medium", status: "completed", remaining_life_years: 0, risk_score: 38, matched_contractor_count: 3, actual_cost: 88500, cost_variance_percent: -6.8, ai_prediction_accuracy: 93.2, completed_at: "2025-11-15", owner_rating: 4, owner_feedback: "Travaux bien réalisés, léger dépassement du calendrier." },
  { id: "4", component: "Stationnement", title: "Membrane de stationnement", estimated_cost: 280000, estimated_year: 2031, priority: "high", status: "detected", remaining_life_years: 5, risk_score: 72, matched_contractor_count: 2, actual_cost: null, cost_variance_percent: null, ai_prediction_accuracy: null, completed_at: null, owner_rating: null, owner_feedback: null },
  { id: "5", component: "CVAC", title: "Remplacement système CVAC", estimated_cost: 120000, estimated_year: 2035, priority: "medium", status: "detected", remaining_life_years: 9, risk_score: 45, matched_contractor_count: 5, actual_cost: null, cost_variance_percent: null, ai_prediction_accuracy: null, completed_at: null, owner_rating: null, owner_feedback: null },
];

const MOCK_CONTRACTORS = [
  { name: "Toitures Montréal Pro", specialty: "Toiture", aipp: 87, reviews: 124, verified: true, available: true },
  { name: "FenêtreXpert Québec", specialty: "Fenêtres", aipp: 82, reviews: 89, verified: true, available: true },
  { name: "Maçonnerie Alliance", specialty: "Maçonnerie", aipp: 79, reviews: 67, verified: true, available: false },
  { name: "BétonPlus Inc.", specialty: "Stationnement", aipp: 91, reviews: 156, verified: true, available: true },
  { name: "Mécanik Pro", specialty: "CVAC", aipp: 75, reviews: 43, verified: true, available: true },
];

const MOCK_RECOMMENDATIONS = [
  { type: "risk", title: "Toiture à risque critique", description: "La membrane de toiture atteindra sa fin de vie dans 4 ans. Planifier maintenant pourrait réduire les coûts de 25%.", priority: "critical", estimated_savings_percent: 25, action: "Planifier une inspection" },
  { type: "saving", title: "Économie par planification anticipée", description: "En planifiant les travaux de fenêtres 3 ans d'avance, vous économisez environ 18% sur les coûts totaux.", priority: "high", estimated_savings_percent: 18, action: "Créer un projet" },
  { type: "opportunity", title: "Subvention RénoClimat disponible", description: "Programme provincial: jusqu'à 20 000$ pour l'amélioration énergétique des copropriétés.", priority: "medium", estimated_savings_percent: null, action: "Vérifier l'admissibilité" },
];

const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: "text-rose-400", bg: "bg-rose-500/20 border-rose-500/30", label: "Critique" },
  high: { color: "text-amber-400", bg: "bg-amber-500/20 border-amber-500/30", label: "Élevée" },
  medium: { color: "text-blue-400", bg: "bg-blue-500/20 border-blue-500/30", label: "Moyenne" },
  low: { color: "text-slate-400", bg: "bg-slate-500/20 border-slate-500/30", label: "Basse" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  detected: { label: "Détecté", color: "bg-rose-500/20 text-rose-300" },
  planning: { label: "Planification", color: "bg-amber-500/20 text-amber-300" },
  bidding: { label: "Appel d'offres", color: "bg-blue-500/20 text-blue-300" },
  in_progress: { label: "En cours", color: "bg-emerald-500/20 text-emerald-300" },
  completed: { label: "Terminé", color: "bg-slate-500/20 text-slate-300" },
};

/* ── Completion Form ── */
function CompletionForm({ project, syndicateId, onClose }: { project: any; syndicateId: string; onClose: () => void }) {
  const [actualCost, setActualCost] = useState(project.estimated_cost?.toString() || "");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const completeMutation = useCompleteProject();

  const handleSubmit = () => {
    if (!actualCost) return;
    completeMutation.mutate({
      syndicate_id: syndicateId,
      project_id: project.id,
      actual_cost: parseInt(actualCost),
      owner_rating: rating || undefined,
      owner_feedback: feedback || undefined,
    }, {
      onSuccess: (data) => {
        toast.success(`Projet complété — Précision IA: ${data?.ai_prediction_accuracy?.toFixed(1)}%`);
        onClose();
      },
      onError: () => toast.error("Erreur lors de la complétion"),
    });
  };

  const variance = actualCost ? Math.round(((parseInt(actualCost) - project.estimated_cost) / project.estimated_cost) * 100 * 10) / 10 : 0;

  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
      <div className="pt-4 border-t border-white/10 space-y-4">
        <h4 className="text-sm font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Compléter le projet</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Coût réel ($)</label>
            <Input
              type="number"
              value={actualCost}
              onChange={(e) => setActualCost(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="ex: 195000"
            />
            {actualCost && (
              <div className={`text-xs mt-1 font-medium ${variance > 10 ? "text-rose-400" : variance < -10 ? "text-emerald-400" : "text-blue-400"}`}>
                <ArrowUpDown className="w-3 h-3 inline mr-1" />
                {variance > 0 ? "+" : ""}{variance}% vs estimation ({project.estimated_cost?.toLocaleString("fr-CA")} $)
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Évaluation entrepreneur</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setRating(s)} className="p-1 transition-transform hover:scale-110">
                  <Star className={`w-5 h-5 ${s <= rating ? "text-amber-400 fill-amber-400" : "text-slate-600"}`} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">Commentaire (optionnel)</label>
          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="bg-white/5 border-white/10 text-white min-h-[60px]"
            placeholder="Qualité des travaux, respect des délais…"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={!actualCost || completeMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 gap-1 text-xs"
            size="sm"
          >
            <CheckCircle2 className="w-3 h-3" />
            {completeMutation.isPending ? "Enregistrement…" : "Confirmer la complétion"}
          </Button>
          <Button onClick={onClose} variant="outline" className="border-white/10 text-white hover:bg-white/10 text-xs" size="sm">
            Annuler
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Completed Project Result Card ── */
function CompletedResult({ project }: { project: any }) {
  if (project.status !== "completed" || !project.actual_cost) return null;
  const variance = project.cost_variance_percent ?? 0;
  const accuracy = project.ai_prediction_accuracy ?? 0;

  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="overflow-hidden">
      <div className="pt-3 mt-3 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg bg-white/[0.03] p-3 text-center">
          <div className="text-[10px] text-slate-500 uppercase mb-1">Coût réel</div>
          <div className="font-display font-bold text-emerald-400">{project.actual_cost.toLocaleString("fr-CA")} $</div>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-3 text-center">
          <div className="text-[10px] text-slate-500 uppercase mb-1">Écart</div>
          <div className={`font-display font-bold ${variance > 10 ? "text-rose-400" : variance < -5 ? "text-emerald-400" : "text-blue-400"}`}>
            {variance > 0 ? "+" : ""}{variance.toFixed(1)}%
          </div>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-3 text-center">
          <div className="text-[10px] text-slate-500 uppercase mb-1">Précision IA</div>
          <div className={`font-display font-bold ${accuracy >= 90 ? "text-emerald-400" : accuracy >= 75 ? "text-blue-400" : "text-amber-400"}`}>
            {accuracy.toFixed(1)}%
          </div>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-3 text-center">
          <div className="text-[10px] text-slate-500 uppercase mb-1">Note</div>
          <div className="flex items-center justify-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`w-3 h-3 ${s <= (project.owner_rating || 0) ? "text-amber-400 fill-amber-400" : "text-slate-600"}`} />
            ))}
          </div>
        </div>
        {project.owner_feedback && (
          <div className="col-span-full text-xs text-slate-400 italic">"{project.owner_feedback}"</div>
        )}
      </div>
    </motion.div>
  );
}

export default function SyndicateGrowthDashboard() {
  const { id } = useParams<{ id: string }>();
  const { data: syndicate } = useSyndicate(id);
  const { data: dbProjects } = useSyndicateProjects(id);
  const { data: forecasts } = useCapexForecasts(id);
  const { data: benchmarks } = useMarketBenchmarks();
  const scanMutation = useRunGrowthScan(id);
  const { data: aiRecs } = useAIRecommendations(id);

  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [completingProject, setCompletingProject] = useState<string | null>(null);

  const projects = dbProjects?.length ? dbProjects : MOCK_PROJECTS;
  const recommendations = aiRecs?.length ? aiRecs : MOCK_RECOMMENDATIONS;

  const activeProjects = projects.filter((p: any) => p.status !== "completed");
  const completedProjects = projects.filter((p: any) => p.status === "completed");
  const totalProjectValue = activeProjects.reduce((sum: number, p: any) => sum + (p.estimated_cost || 0), 0);
  const criticalCount = activeProjects.filter((p: any) => p.priority === "critical").length;
  const highCount = activeProjects.filter((p: any) => p.priority === "high").length;

  // AI prediction accuracy from completed projects
  const completedWithAccuracy = completedProjects.filter((p: any) => p.ai_prediction_accuracy != null);
  const avgAccuracy = completedWithAccuracy.length
    ? Math.round(completedWithAccuracy.reduce((s: number, p: any) => s + p.ai_prediction_accuracy, 0) / completedWithAccuracy.length * 10) / 10
    : null;

  /* ── Pipeline chart data ── */
  const pipelineData = activeProjects.map((p: any) => ({
    name: p.component,
    value: p.estimated_cost / 1000,
    risk: p.risk_score,
  }));

  /* ── Timeline projection ── */
  const currentYear = new Date().getFullYear();
  const timelineData = Array.from({ length: 15 }, (_, i) => {
    const year = currentYear + i;
    const yearProjects = projects.filter((p: any) => p.estimated_year === year);
    const cost = yearProjects.reduce((s: number, p: any) => s + (p.actual_cost || p.estimated_cost), 0);
    return { year, cost: cost / 1000 };
  });

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white -m-6 p-6 md:p-10">
        {/* ── Header ── */}
        <motion.div {...fadeUp(0)} className="mb-8">
          <Link to={`/dashboard/syndicates/${id}`} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-4">
            <ArrowLeft className="w-4 h-4" /> Retour au tableau de bord
          </Link>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
                <Rocket className="w-7 h-7 text-emerald-400" />
                Moteur de Croissance
              </h1>
              <p className="text-slate-400 mt-1">{syndicate?.name || "Copropriété"} — Pipeline de projets automatisé</p>
            </div>
            <Button
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${scanMutation.isPending ? "animate-spin" : ""}`} />
              {scanMutation.isPending ? "Analyse en cours…" : "Scanner les composantes"}
            </Button>
          </div>
        </motion.div>

        {/* ── Top Metrics ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Valeur pipeline", value: `${(totalProjectValue / 1000).toFixed(0)}k $`, icon: DollarSign, color: "text-emerald-400" },
            { label: "Projets actifs", value: activeProjects.length, icon: Target, color: "text-blue-400" },
            { label: "Alertes critiques", value: criticalCount, icon: AlertTriangle, color: "text-rose-400" },
            { label: "Priorité élevée", value: highCount, icon: Zap, color: "text-amber-400" },
            { label: "Précision IA", value: avgAccuracy ? `${avgAccuracy}%` : "—", icon: Award, color: "text-violet-400" },
          ].map((m, i) => (
            <motion.div key={m.label} {...fadeUp(i + 1)}>
              <GlassCard className="text-center">
                <m.icon className={`w-5 h-5 mx-auto mb-2 ${m.color}`} />
                <div className="font-display text-2xl font-bold">{m.value}</div>
                <div className="text-xs text-slate-400 mt-1">{m.label}</div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* ── Pipeline Chart ── */}
        <motion.div {...fadeUp(6)}>
          <GlassCard className="mb-8">
            <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" /> Pipeline par composante (k$)
            </h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData}>
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
                    formatter={(v: number) => [`${v}k $`, "Coût estimé"]}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {pipelineData.map((entry: any, index: number) => (
                      <Cell key={index} fill={entry.risk > 70 ? "#f43f5e" : entry.risk > 50 ? "#f59e0b" : "#3b82f6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>

        {/* ── Projects List ── */}
        <motion.div {...fadeUp(7)}>
          <GlassCard className="mb-8">
            <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-400" /> Projets détectés
            </h2>
            <div className="space-y-3">
              {projects.map((project: any, i: number) => {
                const pConfig = priorityConfig[project.priority] || priorityConfig.medium;
                const sConfig = statusConfig[project.status] || statusConfig.detected;
                const isExpanded = selectedProject === project.id;
                const isCompleting = completingProject === project.id;
                const isCompleted = project.status === "completed";

                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-xl border transition-all ${isCompleted ? "border-emerald-500/20 bg-emerald-500/[0.03]" : isExpanded ? "border-white/20 bg-white/[0.07]" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"}`}
                  >
                    <div
                      className="p-4 flex items-center gap-4 cursor-pointer"
                      onClick={() => setSelectedProject(isExpanded ? null : project.id)}
                    >
                      {/* Risk indicator */}
                      <div className="hidden md:flex flex-col items-center gap-1 min-w-[48px]">
                        {isCompleted ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <>
                            <div className={`text-lg font-bold ${project.risk_score > 70 ? "text-rose-400" : project.risk_score > 50 ? "text-amber-400" : "text-blue-400"}`}>
                              {project.risk_score}
                            </div>
                            <div className="text-[10px] text-slate-500 uppercase">Risque</div>
                          </>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">{project.title}</span>
                          <Badge className={`${pConfig.bg} ${pConfig.color} text-[10px] border px-1.5 py-0`}>{pConfig.label}</Badge>
                          <Badge className={`${sConfig.color} text-[10px] px-1.5 py-0`}>{sConfig.label}</Badge>
                          {isCompleted && project.ai_prediction_accuracy != null && (
                            <Badge className="bg-violet-500/20 text-violet-300 text-[10px] px-1.5 py-0">
                              IA {project.ai_prediction_accuracy.toFixed(0)}%
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" />{project.estimated_year}</span>
                          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{(project.estimated_cost / 1000).toFixed(0)}k $</span>
                          {!isCompleted && (
                            <>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{project.remaining_life_years} ans restants</span>
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{project.matched_contractor_count} entrepreneurs</span>
                            </>
                          )}
                          {isCompleted && project.actual_cost && (
                            <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3 h-3" />Réel: {(project.actual_cost / 1000).toFixed(0)}k $</span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </div>

                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="px-4 pb-4 border-t border-white/5"
                      >
                        {isCompleted ? (
                          <CompletedResult project={project} />
                        ) : (
                          <div className="pt-4 grid md:grid-cols-3 gap-4">
                            <div>
                              <div className="text-xs text-slate-500 mb-1">Coût estimé</div>
                              <div className="font-display text-xl font-bold">{(project.estimated_cost).toLocaleString("fr-CA")} $</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 mb-1">Vie résiduelle</div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                                  <motion.div
                                    className={`h-full rounded-full ${project.remaining_life_years <= 3 ? "bg-rose-500" : project.remaining_life_years <= 5 ? "bg-amber-500" : "bg-emerald-500"}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (project.remaining_life_years / 15) * 100)}%` }}
                                    transition={{ duration: 0.8 }}
                                  />
                                </div>
                                <span className="text-sm font-medium">{project.remaining_life_years} ans</span>
                              </div>
                            </div>
                            <div className="flex items-end gap-2 flex-wrap">
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 gap-1 text-xs">
                                <Send className="w-3 h-3" /> Inviter entrepreneurs
                              </Button>
                              <Button
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); setCompletingProject(project.id); }}
                                className="bg-violet-600 hover:bg-violet-500 text-white border-0 gap-1 text-xs"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Compléter
                              </Button>
                            </div>
                          </div>
                        )}

                        <AnimatePresence>
                          {isCompleting && !isCompleted && (
                            <CompletionForm
                              project={project}
                              syndicateId={id!}
                              onClose={() => setCompletingProject(null)}
                            />
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>

        {/* ── Timeline + Contractors ── */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Timeline projection */}
          <motion.div {...fadeUp(8)}>
            <GlassCard>
              <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-blue-400" /> Projection des travaux
              </h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData}>
                    <defs>
                      <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
                      formatter={(v: number) => [`${v}k $`, "Investissement"]}
                    />
                    <Area type="monotone" dataKey="cost" stroke="#3b82f6" fill="url(#costGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>

          {/* Matched Contractors */}
          <motion.div {...fadeUp(9)}>
            <GlassCard>
              <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" /> Entrepreneurs vérifiés
              </h2>
              <div className="space-y-3">
                {MOCK_CONTRACTORS.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-emerald-500/20 flex items-center justify-center text-sm font-bold text-blue-300">
                      {c.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{c.name}</span>
                        {c.verified && <BadgeCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span>{c.specialty}</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" />{c.aipp} AIPP</span>
                        <span>{c.reviews} avis</span>
                      </div>
                    </div>
                    <Badge className={c.available ? "bg-emerald-500/20 text-emerald-300 text-[10px]" : "bg-slate-500/20 text-slate-400 text-[10px]"}>
                      {c.available ? "Disponible" : "Occupé"}
                    </Badge>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* ── AI Recommendations ── */}
        <motion.div {...fadeUp(10)}>
          <GlassCard className="mb-8">
            <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" /> Recommandations IA
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {recommendations.map((rec: any, i: number) => {
                const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
                  risk: { icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-500/10" },
                  saving: { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                  opportunity: { icon: Sparkles, color: "text-violet-400", bg: "bg-violet-500/10" },
                };
                const tc = typeConfig[rec.type] || typeConfig.risk;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                    className={`rounded-xl p-4 border border-white/5 ${tc.bg}`}
                  >
                    <tc.icon className={`w-5 h-5 ${tc.color} mb-2`} />
                    <h3 className="font-semibold text-sm mb-1">{rec.title}</h3>
                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">{rec.description}</p>
                    {rec.estimated_savings_percent && (
                      <div className="text-xs font-medium text-emerald-400 mb-2">
                        Économie potentielle: {rec.estimated_savings_percent}%
                      </div>
                    )}
                    <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/10 text-xs h-7 gap-1">
                      <ChevronRight className="w-3 h-3" /> {rec.action}
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>

        {/* ── Data Feedback Loop ── */}
        <motion.div {...fadeUp(11)}>
          <GlassCard className="mb-8">
            <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" /> Boucle d'intelligence
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { step: "1", label: "Coût réel travaux", desc: "Capture du prix final après complétion", color: "from-emerald-500/20 to-emerald-600/10", icon: DollarSign },
                { step: "2", label: "Précision prédiction IA", desc: avgAccuracy ? `Moyenne: ${avgAccuracy}%` : "Calibration en cours", color: "from-violet-500/20 to-violet-600/10", icon: Award },
                { step: "3", label: "Entrepreneurs fiables", desc: "Score mis à jour par feedback réel", color: "from-blue-500/20 to-blue-600/10", icon: ShieldCheck },
                { step: "4", label: "Score bâtiment", desc: "Santé recalculée post-travaux", color: "from-amber-500/20 to-amber-600/10", icon: Target },
              ].map((s, i) => (
                <div key={i} className={`rounded-xl p-4 bg-gradient-to-br ${s.color} border border-white/5 text-center`}>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                    <s.icon className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-semibold mb-1">{s.label}</div>
                  <div className="text-[11px] text-slate-400">{s.desc}</div>
                </div>
              ))}
            </div>

            {/* Completed projects summary */}
            {completedProjects.length > 0 && (
              <div className="mt-6 pt-4 border-t border-white/5">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {completedProjects.length} projet{completedProjects.length > 1 ? "s" : ""} complété{completedProjects.length > 1 ? "s" : ""}
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Coût total réel</div>
                    <div className="font-display font-bold text-emerald-400">
                      {completedProjects.reduce((s: number, p: any) => s + (p.actual_cost || 0), 0).toLocaleString("fr-CA")} $
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Économie vs estimation</div>
                    <div className="font-display font-bold text-blue-400">
                      {(() => {
                        const totalEstimated = completedProjects.reduce((s: number, p: any) => s + (p.estimated_cost || 0), 0);
                        const totalActual = completedProjects.reduce((s: number, p: any) => s + (p.actual_cost || 0), 0);
                        const diff = totalEstimated - totalActual;
                        return diff >= 0 ? `${diff.toLocaleString("fr-CA")} $` : `−${Math.abs(diff).toLocaleString("fr-CA")} $`;
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Précision moyenne</div>
                    <div className="font-display font-bold text-violet-400">
                      {avgAccuracy ? `${avgAccuracy}%` : "—"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* ── Alex AI Prompt ── */}
        <motion.div {...fadeUp(12)}>
          <GlassCard className="bg-gradient-to-r from-violet-500/10 to-blue-500/10 border-violet-500/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-sm mb-1">Alex — Assistant IA</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Bonjour. Votre immeuble aura probablement besoin d'une réfection de toiture dans <span className="text-rose-400 font-semibold">4 ans</span>.
                  Le pipeline total représente <span className="text-emerald-400 font-semibold">{(totalProjectValue / 1000).toFixed(0)}k $</span> de travaux à planifier.
                  {avgAccuracy && <> La précision de nos estimations est de <span className="text-violet-400 font-semibold">{avgAccuracy}%</span>.</>}
                  {" "}Voulez-vous que je planifie une inspection préventive?
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white border-0 text-xs h-7">
                    Oui, planifier
                  </Button>
                  <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/10 text-xs h-7">
                    Voir les détails
                  </Button>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <AlexGlobalOrb />
      </div>
    </DashboardLayout>
  );
}
