import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2, Shield, AlertTriangle, TrendingUp, Calendar, FileText,
  Upload, Sparkles, ChevronRight, CheckCircle2, Clock, Users,
  ArrowLeft, Star, BadgeCheck, Wrench, DollarSign, ChevronDown
} from "lucide-react";
import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import DashboardLayout from "@/layouts/DashboardLayout";
import { useSyndicate, useReserveFundSnapshots, useCapexForecasts } from "@/hooks/useSyndicate";
import ScoreRing from "@/components/ui/score-ring";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AlexGlobalOrb from "@/components/alex/AlexGlobalOrb";

/* ── Animation helpers ── */
const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
});

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 ${className}`}>
    {children}
  </div>
);

/* ── Mock data ── */
const HEALTH_BREAKDOWN = [
  { label: "Structure", score: 84, color: "bg-emerald-500" },
  { label: "Toiture", score: 68, color: "bg-amber-500" },
  { label: "Fenêtres", score: 62, color: "bg-amber-500" },
  { label: "Fonds de prévoyance", score: 58, color: "bg-rose-500" },
];

const TIMELINE_ITEMS = [
  { year: 2027, label: "Inspection toiture", cost: "8 500 $", status: "planned", detail: "Inspection complète de la membrane et du système de drainage." },
  { year: 2029, label: "Remplacement membrane", cost: "190 000 $", status: "critical", detail: "Membrane EPDM fin de vie. Remplacement complet recommandé." },
  { year: 2033, label: "Remplacement fenêtres", cost: "145 000 $", status: "planned", detail: "Fenêtres thermos avec dégradation des joints d'étanchéité." },
  { year: 2037, label: "Réparations maçonnerie", cost: "95 000 $", status: "planned", detail: "Joints de mortier dégradés sur façades nord et est." },
];

const RESERVE_PROJECTION = Array.from({ length: 16 }, (_, i) => ({
  year: 2025 + i,
  actual: Math.round(82000 + i * 12000 - (i > 4 ? 190000 : 0) - (i > 8 ? 145000 : 0)),
  recommended: Math.round(82000 + i * 18000),
})).map(d => ({ ...d, actual: Math.max(0, d.actual) }));

const ACTIVE_PROJECTS = [
  { title: "Réfection toiture", budget: "190 000 $", status: "Planification", contractors: 6, priority: "high" },
  { title: "Remplacement fenêtres", budget: "145 000 $", status: "Analyse", contractors: 4, priority: "medium" },
];

const CONTRACTORS = [
  { name: "Toitures Montréal Pro", specialty: "Toiture", aipp: 87, reviews: 124, verified: true, available: true },
  { name: "FenêtreXpert Québec", specialty: "Fenêtres", aipp: 82, reviews: 89, verified: true, available: true },
  { name: "Maçonnerie Alliance", specialty: "Maçonnerie", aipp: 79, reviews: 67, verified: true, available: false },
];

const AI_INSIGHTS = [
  { icon: AlertTriangle, color: "text-rose-400", title: "Toiture à risque", text: "Votre membrane de toiture atteindra sa fin de vie utile d'ici 4 ans. Planifier maintenant pourrait réduire les coûts de 25%." },
  { icon: TrendingUp, color: "text-amber-400", title: "Fonds de prévoyance insuffisant", text: "Votre fonds couvre 47% des travaux prévus sur 10 ans. Augmentation recommandée de 35% des contributions." },
  { icon: Sparkles, color: "text-emerald-400", title: "Subvention disponible", text: "Programme RénoClimat : jusqu'à 20 000$ pour l'amélioration énergétique des copropriétés." },
];

export default function SyndicateDetailDashboard() {
  const { id } = useParams<{ id: string }>();
  const { data: syndicate } = useSyndicate(id);
  const { data: reserveSnapshots } = useReserveFundSnapshots(id);
  const { data: forecasts } = useCapexForecasts(id);

  const [expandedTimeline, setExpandedTimeline] = useState<number | null>(null);
  const [simCost, setSimCost] = useState(210000);
  const [simUnits, setSimUnits] = useState(20);
  const [simPlanning, setSimPlanning] = useState(5);

  const costPerUnit = Math.round(simCost / simUnits);
  const plannedSavings = Math.round(simCost * (simPlanning * 0.04));
  const plannedCost = simCost - plannedSavings;
  const plannedPerUnit = Math.round(plannedCost / simUnits);

  const buildingName = syndicate?.name || "Copropriété Démo";

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <motion.div {...fadeUp(0)} className="flex items-center gap-3 mb-8">
          <Link to="/dashboard/syndicates" className="text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-white">{buildingName}</h1>
            <p className="text-white/50 text-sm mt-0.5">{syndicate?.address || "123 rue Exemple, Montréal"} · {syndicate?.unit_count || 20} unités</p>
          </div>
        </motion.div>

        {/* ── 1. Building Health Score ── */}
        <motion.div {...fadeUp(1)}>
          <GlassCard className="mb-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <ScoreRing score={74} size={120} strokeWidth={10} label="Santé" colorClass="text-amber-400" />
              </div>
              <div className="flex-1 w-full space-y-3">
                <h2 className="font-display text-lg font-semibold text-white">Score santé immeuble</h2>
                {HEALTH_BREAKDOWN.map((item, i) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">{item.label}</span>
                      <span className="text-white font-medium">{item.score}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${item.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.score}%` }}
                        transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* ── 2. Building Timeline ── */}
        <motion.div {...fadeUp(2)}>
          <GlassCard className="mb-6">
            <h2 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Échéancier des travaux
            </h2>
            <div className="relative pl-6 border-l-2 border-white/10 space-y-4">
              {TIMELINE_ITEMS.map((item, i) => (
                <motion.div
                  key={item.year}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
                  className="relative"
                >
                  <div className={`absolute -left-[1.6rem] top-1 w-3 h-3 rounded-full border-2 ${item.status === "critical" ? "bg-rose-500 border-rose-400" : "bg-white/20 border-white/30"}`} />
                  <button
                    onClick={() => setExpandedTimeline(expandedTimeline === i ? null : i)}
                    className="w-full text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white/40 text-xs font-mono mr-2">{item.year}</span>
                        <span className="text-white font-medium">{item.label}</span>
                        {item.status === "critical" && <Badge variant="destructive" className="ml-2 text-[10px]">Urgent</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/60 text-sm">{item.cost}</span>
                        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${expandedTimeline === i ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                  </button>
                  {expandedTimeline === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="mt-2 ml-1 p-3 rounded-lg bg-white/5 text-white/60 text-sm"
                    >
                      {item.detail}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* ── 3. Reserve Fund ── */}
        <motion.div {...fadeUp(3)}>
          <GlassCard className="mb-6">
            <h2 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" /> Fonds de prévoyance
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded-xl bg-white/5">
                <p className="text-white/50 text-xs">Solde actuel</p>
                <p className="text-white text-xl font-bold">82 000 $</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5">
                <p className="text-white/50 text-xs">Recommandé</p>
                <p className="text-emerald-400 text-xl font-bold">176 000 $</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <p className="text-rose-300 text-sm">Déficit de 94 000 $ détecté dans le fonds de prévoyance.</p>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={RESERVE_PROJECTION}>
                  <defs>
                    <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(222,100%,65%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(222,100%,65%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradRec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(152,69%,51%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(152,69%,51%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "rgba(15,23,42,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 12 }}
                    formatter={(v: number) => `${v.toLocaleString("fr-CA")} $`}
                  />
                  <Area type="monotone" dataKey="recommended" stroke="hsl(152,69%,51%)" fill="url(#gradRec)" strokeWidth={2} />
                  <Area type="monotone" dataKey="actual" stroke="hsl(222,100%,65%)" fill="url(#gradActual)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>

        {/* ── 4. Special Assessment Simulator ── */}
        <motion.div {...fadeUp(4)}>
          <GlassCard className="mb-6">
            <h2 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" /> Simulateur de cotisation spéciale
            </h2>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">Coût du projet</span>
                  <span className="text-white font-medium">{simCost.toLocaleString("fr-CA")} $</span>
                </div>
                <Slider min={50000} max={500000} step={5000} value={[simCost]} onValueChange={([v]) => setSimCost(v)} className="[&_[role=slider]]:bg-white [&_[data-orientation=horizontal]>span:first-child]:bg-white/10 [&_[data-orientation=horizontal]>span:first-child>span]:bg-primary" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">Nombre d'unités</span>
                  <span className="text-white font-medium">{simUnits}</span>
                </div>
                <Slider min={2} max={100} step={1} value={[simUnits]} onValueChange={([v]) => setSimUnits(v)} className="[&_[role=slider]]:bg-white [&_[data-orientation=horizontal]>span:first-child]:bg-white/10 [&_[data-orientation=horizontal]>span:first-child>span]:bg-primary" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">Années de planification</span>
                  <span className="text-white font-medium">{simPlanning} ans</span>
                </div>
                <Slider min={0} max={10} step={1} value={[simPlanning]} onValueChange={([v]) => setSimPlanning(v)} className="[&_[role=slider]]:bg-white [&_[data-orientation=horizontal]>span:first-child]:bg-white/10 [&_[data-orientation=horizontal]>span:first-child>span]:bg-primary" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <p className="text-rose-300 text-xs mb-1">Sans planification</p>
                  <p className="text-white text-lg font-bold">{costPerUnit.toLocaleString("fr-CA")} $</p>
                  <p className="text-white/40 text-[10px]">par condo</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-emerald-300 text-xs mb-1">Avec planification</p>
                  <p className="text-white text-lg font-bold">{plannedPerUnit.toLocaleString("fr-CA")} $</p>
                  <p className="text-white/40 text-[10px]">par condo</p>
                </div>
              </div>
              {simPlanning > 0 && (
                <p className="text-emerald-400 text-sm text-center">
                  Économie potentielle : {plannedSavings.toLocaleString("fr-CA")} $ ({Math.round((plannedSavings / simCost) * 100)}%)
                </p>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* ── 5. Active Projects ── */}
        <motion.div {...fadeUp(5)}>
          <GlassCard className="mb-6">
            <h2 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary" /> Projets actifs
            </h2>
            <div className="space-y-3">
              {ACTIVE_PROJECTS.map((p) => (
                <div key={p.title} className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-white font-medium">{p.title}</h3>
                    <Badge variant={p.priority === "high" ? "destructive" : "secondary"} className="text-[10px]">
                      {p.priority === "high" ? "Haute priorité" : "Moyenne"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-white/50">
                    <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{p.budget}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{p.status}</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{p.contractors} entrepreneurs</span>
                  </div>
                  <Button size="sm" variant="outline" className="mt-3 border-white/10 text-white hover:bg-white/10 text-xs">
                    Inviter des entrepreneurs
                  </Button>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* ── 6. Verified Contractors ── */}
        <motion.div {...fadeUp(6)}>
          <GlassCard className="mb-6">
            <h2 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" /> Entrepreneurs vérifiés
            </h2>
            <div className="space-y-3">
              {CONTRACTORS.map((c) => (
                <div key={c.name} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{c.name}</span>
                      {c.verified && <BadgeCheck className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/50 mt-0.5">
                      <span>{c.specialty}</span>
                      <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400" />{c.reviews} avis</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-primary font-bold text-sm">AIPP {c.aipp}</p>
                    <Badge variant={c.available ? "default" : "secondary"} className="text-[10px] mt-0.5">
                      {c.available ? "Disponible" : "Occupé"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* ── 7. Document Center ── */}
        <motion.div {...fadeUp(7)}>
          <GlassCard className="mb-6">
            <h2 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-white/60" /> Centre de documents
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {["Étude fonds prévoyance", "Rapport inspection", "Soumissions", "Historique entretien"].map((doc) => (
                <div key={doc} className="p-3 rounded-xl bg-white/5 border border-dashed border-white/10 flex flex-col items-center gap-2 text-center cursor-pointer hover:bg-white/10 transition-colors">
                  <Upload className="w-5 h-5 text-white/30" />
                  <span className="text-white/50 text-xs">{doc}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/10 gap-2">
              <Sparkles className="w-4 h-4" /> Analyser avec l'IA
            </Button>
          </GlassCard>
        </motion.div>

        {/* ── 8. AI Insights ── */}
        <motion.div {...fadeUp(8)}>
          <GlassCard className="mb-24">
            <h2 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-secondary" /> Recommandations IA
            </h2>
            <div className="space-y-3">
              {AI_INSIGHTS.map((insight) => (
                <div key={insight.title} className="flex gap-3 p-3 rounded-xl bg-white/5">
                  <insight.icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${insight.color}`} />
                  <div>
                    <p className="text-white font-medium text-sm">{insight.title}</p>
                    <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{insight.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        <AlexGlobalOrb />
      </div>
    </DashboardLayout>
  );
}
