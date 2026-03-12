import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Building2, AlertTriangle, TrendingUp, Sparkles, ChevronRight, Clock,
  Users, ArrowLeft, Star, BadgeCheck, Wrench, DollarSign, Zap, Target,
  CalendarClock, ShieldCheck, BarChart3, Rocket, RefreshCw, Send
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useSyndicate, useCapexForecasts } from "@/hooks/useSyndicate";
import { useSyndicateProjects, useRunGrowthScan, useAIRecommendations } from "@/hooks/useGrowthEngine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AlexGlobalOrb from "@/components/alex/AlexGlobalOrb";

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
  { id: "1", component: "Toiture", title: "Remplacement membrane de toiture", estimated_cost: 210000, estimated_year: 2029, priority: "critical", status: "detected", remaining_life_years: 4, risk_score: 85, matched_contractor_count: 6 },
  { id: "2", component: "Fenêtres", title: "Remplacement fenêtres thermos", estimated_cost: 145000, estimated_year: 2033, priority: "high", status: "planning", remaining_life_years: 7, risk_score: 62, matched_contractor_count: 4 },
  { id: "3", component: "Maçonnerie", title: "Réparations joints de maçonnerie", estimated_cost: 95000, estimated_year: 2037, priority: "medium", status: "detected", remaining_life_years: 11, risk_score: 38, matched_contractor_count: 3 },
  { id: "4", component: "Stationnement", title: "Membrane de stationnement", estimated_cost: 280000, estimated_year: 2031, priority: "high", status: "detected", remaining_life_years: 5, risk_score: 72, matched_contractor_count: 2 },
  { id: "5", component: "CVAC", title: "Remplacement système CVAC", estimated_cost: 120000, estimated_year: 2035, priority: "medium", status: "detected", remaining_life_years: 9, risk_score: 45, matched_contractor_count: 5 },
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

export default function SyndicateGrowthDashboard() {
  const { id } = useParams<{ id: string }>();
  const { data: syndicate } = useSyndicate(id);
  const { data: dbProjects } = useSyndicateProjects(id);
  const { data: forecasts } = useCapexForecasts(id);
  const scanMutation = useRunGrowthScan(id);
  const { data: aiRecs } = useAIRecommendations(id);

  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const projects = dbProjects?.length ? dbProjects : MOCK_PROJECTS;
  const recommendations = aiRecs?.length ? aiRecs : MOCK_RECOMMENDATIONS;

  const totalProjectValue = projects.reduce((sum: number, p: any) => sum + (p.estimated_cost || 0), 0);
  const criticalCount = projects.filter((p: any) => p.priority === "critical").length;
  const highCount = projects.filter((p: any) => p.priority === "high").length;

  /* ── Pipeline value chart data ── */
  const pipelineData = projects.map((p: any) => ({
    name: p.component,
    value: p.estimated_cost / 1000,
    risk: p.risk_score,
  }));

  /* ── Timeline projection ── */
  const currentYear = new Date().getFullYear();
  const timelineData = Array.from({ length: 15 }, (_, i) => {
    const year = currentYear + i;
    const yearProjects = projects.filter((p: any) => p.estimated_year === year);
    const cost = yearProjects.reduce((s: number, p: any) => s + p.estimated_cost, 0);
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Valeur pipeline", value: `${(totalProjectValue / 1000).toFixed(0)}k $`, icon: DollarSign, color: "text-emerald-400" },
            { label: "Projets actifs", value: projects.length, icon: Target, color: "text-blue-400" },
            { label: "Alertes critiques", value: criticalCount, icon: AlertTriangle, color: "text-rose-400" },
            { label: "Priorité élevée", value: highCount, icon: Zap, color: "text-amber-400" },
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
        <motion.div {...fadeUp(5)}>
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
        <motion.div {...fadeUp(6)}>
          <GlassCard className="mb-8">
            <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-400" /> Projets détectés
            </h2>
            <div className="space-y-3">
              {projects.map((project: any, i: number) => {
                const pConfig = priorityConfig[project.priority] || priorityConfig.medium;
                const sConfig = statusConfig[project.status] || statusConfig.detected;
                const isExpanded = selectedProject === project.id;

                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-xl border transition-all cursor-pointer ${isExpanded ? "border-white/20 bg-white/[0.07]" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"}`}
                    onClick={() => setSelectedProject(isExpanded ? null : project.id)}
                  >
                    <div className="p-4 flex items-center gap-4">
                      {/* Risk indicator */}
                      <div className="hidden md:flex flex-col items-center gap-1 min-w-[48px]">
                        <div className={`text-lg font-bold ${project.risk_score > 70 ? "text-rose-400" : project.risk_score > 50 ? "text-amber-400" : "text-blue-400"}`}>
                          {project.risk_score}
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase">Risque</div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">{project.title}</span>
                          <Badge className={`${pConfig.bg} ${pConfig.color} text-[10px] border px-1.5 py-0`}>{pConfig.label}</Badge>
                          <Badge className={`${sConfig.color} text-[10px] px-1.5 py-0`}>{sConfig.label}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" />{project.estimated_year}</span>
                          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{(project.estimated_cost / 1000).toFixed(0)}k $</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{project.remaining_life_years} ans restants</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{project.matched_contractor_count} entrepreneurs</span>
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
                          <div className="flex items-end gap-2">
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 gap-1 text-xs">
                              <Send className="w-3 h-3" /> Inviter entrepreneurs
                            </Button>
                            <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/10 text-xs">
                              Planifier
                            </Button>
                          </div>
                        </div>
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
          <motion.div {...fadeUp(7)}>
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
          <motion.div {...fadeUp(8)}>
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
        <motion.div {...fadeUp(9)}>
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
        <motion.div {...fadeUp(10)}>
          <GlassCard className="mb-8">
            <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" /> Boucle d'intelligence
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { step: "1", label: "Analyse composantes", desc: "Détection automatique des risques", color: "from-blue-500/20 to-blue-600/10" },
                { step: "2", label: "Création projets", desc: "Projets générés automatiquement", color: "from-amber-500/20 to-amber-600/10" },
                { step: "3", label: "Matching entrepreneurs", desc: "AIPP + localisation + spécialité", color: "from-emerald-500/20 to-emerald-600/10" },
                { step: "4", label: "Feedback & apprentissage", desc: "Coûts réels → modèle prédictif", color: "from-violet-500/20 to-violet-600/10" },
              ].map((s, i) => (
                <div key={i} className={`rounded-xl p-4 bg-gradient-to-br ${s.color} border border-white/5 text-center`}>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2 font-display font-bold text-sm">{s.step}</div>
                  <div className="text-sm font-semibold mb-1">{s.label}</div>
                  <div className="text-[11px] text-slate-400">{s.desc}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* ── Alex AI Prompt ── */}
        <motion.div {...fadeUp(11)}>
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
                  Voulez-vous que je planifie une inspection préventive?
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
