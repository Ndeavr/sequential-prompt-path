/**
 * UNPRO — Calculateur IA v3 (Auto-optimisé + Data-driven)
 * Connected to Supabase JVE data, AI optimization suggestions, recharts viz.
 */
import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Calculator, TrendingUp, ArrowRight, Target, MapPin, Briefcase, DollarSign,
  BarChart3, Zap, Crown, Star, Users, Shield, Sparkles, Brain, Lightbulb,
  ChevronUp, AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import {
  saveCalculatorSession, recommendPlan, estimateAppointments, estimateBudget,
} from "@/services/calculatorSessionService";
import { useJveTrades, useJveCities, useJobValueEstimate } from "@/hooks/useJobValueEngine";

// ─── Constants ───

const PROJECT_TYPES = [
  { id: "S", label: "S", desc: "Petit projet", price: "15 $", cost: 15 },
  { id: "M", label: "M", desc: "Projet moyen", price: "50 $", cost: 50 },
  { id: "L", label: "L", desc: "Grand projet", price: "120 $", cost: 120 },
  { id: "XL", label: "XL", desc: "Très grand projet", price: "250 $", cost: 250 },
  { id: "XXL", label: "XXL", desc: "Projet majeur", price: "500 $", cost: 500 },
];

const PLAN_META: Record<string, { icon: React.ElementType; color: string; label: string; monthly: number }> = {
  recrue: { icon: Users, color: "text-muted-foreground", label: "Recrue", monthly: 0 },
  pro: { icon: TrendingUp, color: "text-primary", label: "Pro", monthly: 49 },
  premium: { icon: Star, color: "text-primary", label: "Premium", monthly: 99 },
  elite: { icon: Crown, color: "text-accent", label: "Élite", monthly: 199 },
  signature: { icon: Shield, color: "text-secondary", label: "Signature", monthly: 399 },
};

// ─── AI Optimization Engine ───

interface AISuggestion {
  icon: React.ElementType;
  text: string;
  type: "upgrade" | "optimize" | "insight";
}

function generateSuggestions(params: {
  plan: string;
  profit: number;
  appts: number;
  capacity: number;
  avgJobValue: number;
  projectTypes: string[];
  revenueGoal: number;
}): AISuggestion[] {
  const { plan, profit, appts, capacity, avgJobValue, projectTypes, revenueGoal } = params;
  const suggestions: AISuggestion[] = [];

  // Low profit → suggest bigger projects
  if (profit < 0 || (profit > 0 && profit / (profit + avgJobValue) < 0.3)) {
    const suggestedValue = Math.round(avgJobValue * 1.5 / 500) * 500;
    suggestions.push({
      icon: DollarSign,
      text: `En augmentant votre panier moyen à ${suggestedValue.toLocaleString()} $, vous réduisez vos rendez-vous nécessaires de ${Math.round((1 - avgJobValue / suggestedValue) * 100)} %.`,
      type: "optimize",
    });
  }

  // Too many appointments needed
  if (appts > capacity) {
    if (plan !== "elite" && plan !== "signature") {
      suggestions.push({
        icon: Crown,
        text: `Passez à ${plan === "premium" ? "Élite" : "Premium"} pour accéder aux projets ${plan === "premium" ? "XXL" : "XL"} et réduire votre volume.`,
        type: "upgrade",
      });
    }
    if (!projectTypes.includes("XL") && !projectTypes.includes("XXL")) {
      suggestions.push({
        icon: Lightbulb,
        text: `Cibler des projets L et XL augmenterait votre valeur moyenne et réduirait le nombre de rendez-vous nécessaires.`,
        type: "optimize",
      });
    }
  }

  // Capacity underused
  if (appts < capacity * 0.4 && capacity > 10) {
    suggestions.push({
      icon: Zap,
      text: `Avec votre capacité de ${capacity} rendez-vous/mois, vous pourriez augmenter votre objectif à ${Math.round(capacity * avgJobValue * 0.3).toLocaleString()} $ pour maximiser votre potentiel.`,
      type: "insight",
    });
  }

  // Signature push
  if (revenueGoal >= 50000) {
    suggestions.push({
      icon: Shield,
      text: `Avec un objectif de ${revenueGoal.toLocaleString()} $/mois, le plan Signature avec exclusivité territoriale est recommandé.`,
      type: "upgrade",
    });
  }

  // Premium / Elite upsell
  if (plan === "recrue" || plan === "pro") {
    suggestions.push({
      icon: Star,
      text: `Les entrepreneurs les plus performants utilisent Premium ou Élite pour maximiser leurs rendez-vous garantis.`,
      type: "upgrade",
    });
  }

  return suggestions.slice(0, 3);
}

// ─── Auto-Optimize Logic ───

function autoOptimize(params: {
  revenueGoal: number;
  avgJobValue: number;
  conversionRate: number;
  capacity: number;
  projectTypes: string[];
}): {
  projectTypes: string[];
  avgJobValue: number;
} {
  let { avgJobValue, projectTypes, revenueGoal, conversionRate, capacity } = params;
  const rate = conversionRate / 100;
  const needed = Math.ceil(revenueGoal / (avgJobValue * rate));

  // If needed exceeds capacity, boost avg value & add bigger project types
  if (needed > capacity) {
    const targetValue = Math.ceil(revenueGoal / (capacity * rate) / 500) * 500;
    avgJobValue = Math.max(avgJobValue, Math.min(targetValue, 50000));

    if (avgJobValue >= 15000 && !projectTypes.includes("XXL")) {
      projectTypes = [...new Set([...projectTypes, "XL", "XXL"])];
    } else if (avgJobValue >= 8000 && !projectTypes.includes("XL")) {
      projectTypes = [...new Set([...projectTypes, "XL"])];
    } else if (avgJobValue >= 4000 && !projectTypes.includes("L")) {
      projectTypes = [...new Set([...projectTypes, "L"])];
    }
  }

  return { projectTypes, avgJobValue };
}

// ─── Component ───

export default function AppointmentCalculator() {
  const navigate = useNavigate();

  // Supabase data
  const { data: trades } = useJveTrades();
  const { data: cities } = useJveCities();

  // User inputs
  const [revenueGoal, setRevenueGoal] = useState([15000]);
  const [citySlug, setCitySlug] = useState("");
  const [tradeSlug, setTradeSlug] = useState("");
  const [avgJobValue, setAvgJobValue] = useState([8000]);
  const [conversionRate, setConversionRate] = useState([30]);
  const [capacity, setCapacity] = useState([15]);
  const [projectTypes, setProjectTypes] = useState<string[]>(["S", "M", "L"]);
  const [autoOptimizeEnabled, setAutoOptimizeEnabled] = useState(false);

  // Fetch JVE estimate when trade + city selected
  const jveParams = useMemo(() => {
    if (!tradeSlug) return null;
    return { tradeSlug, citySlug: citySlug || undefined };
  }, [tradeSlug, citySlug]);

  const { data: jveEstimate } = useJobValueEstimate(jveParams);

  // Auto-fill avg job value from JVE
  useEffect(() => {
    if (jveEstimate && !jveEstimate.error && jveEstimate.final_avg_value > 0) {
      setAvgJobValue([Math.round(jveEstimate.final_avg_value)]);
    }
  }, [jveEstimate]);

  const toggleProjectType = (id: string) => {
    setProjectTypes((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // Apply auto-optimize
  const optimized = useMemo(() => {
    if (!autoOptimizeEnabled) return { projectTypes, avgJobValue: avgJobValue[0] };
    return autoOptimize({
      revenueGoal: revenueGoal[0],
      avgJobValue: avgJobValue[0],
      conversionRate: conversionRate[0],
      capacity: capacity[0],
      projectTypes,
    });
  }, [autoOptimizeEnabled, revenueGoal, avgJobValue, conversionRate, capacity, projectTypes]);

  const effectiveValue = optimized.avgJobValue;
  const effectiveTypes = optimized.projectTypes;

  const plan = useMemo(
    () => recommendPlan({ revenueGoal: revenueGoal[0], projectTypes: effectiveTypes, monthlyCapacity: capacity[0] }),
    [revenueGoal, effectiveTypes, capacity]
  );

  // Appointments needed to reach goal
  const apptsNeeded = useMemo(
    () => estimateAppointments(revenueGoal[0], effectiveValue, conversionRate[0] / 100),
    [revenueGoal, effectiveValue, conversionRate]
  );

  // Actual appointments capped by capacity
  const appts = Math.min(apptsNeeded, capacity[0]);

  // Average appointment cost based on selected project types
  const avgApptCost = useMemo(() => {
    const selected = PROJECT_TYPES.filter((p) => effectiveTypes.includes(p.id));
    if (selected.length === 0) return 50;
    return selected.reduce((sum, p) => sum + p.cost, 0) / selected.length;
  }, [effectiveTypes]);

  const totalCost = useMemo(
    () => (PLAN_META[plan]?.monthly ?? 0) + appts * avgApptCost,
    [plan, appts, avgApptCost]
  );

  // Revenue based on actual appointments (capacity-limited)
  const potentialRevenue = appts * effectiveValue * (conversionRate[0] / 100);
  const profit = potentialRevenue - totalCost;
  const roi = totalCost > 0 ? Math.round(potentialRevenue / totalCost) : 0;
  const goalProgress = Math.min(100, Math.round((potentialRevenue / revenueGoal[0]) * 100));
  const capacityLimited = apptsNeeded > capacity[0];

  const suggestions = useMemo(
    () => generateSuggestions({
      plan, profit, appts, capacity: capacity[0], avgJobValue: effectiveValue,
      projectTypes: effectiveTypes, revenueGoal: revenueGoal[0],
    }),
    [plan, profit, appts, capacity, effectiveValue, effectiveTypes, revenueGoal]
  );

  const PlanIcon = PLAN_META[plan]?.icon ?? Users;
  const planLabel = PLAN_META[plan]?.label ?? plan;

  // Chart data
  const chartData = [
    { name: "Revenu", value: Math.round(potentialRevenue), fill: "hsl(var(--success))" },
    { name: "Coût", value: Math.round(totalCost), fill: "hsl(var(--destructive))" },
    { name: "Profit", value: Math.max(0, Math.round(profit)), fill: "hsl(var(--primary))" },
  ];

  const handleContinue = () => {
    const cityName = cities?.find((c: any) => c.slug === citySlug)?.name_fr ?? citySlug;
    const tradeName = trades?.find((t: any) => t.slug === tradeSlug)?.name_fr ?? tradeSlug;

    saveCalculatorSession({
      revenueGoal: revenueGoal[0],
      city: cityName,
      category: tradeName,
      specialty: "",
      avgJobValue: effectiveValue,
      conversionRate: conversionRate[0],
      monthlyCapacity: capacity[0],
      projectTypes: effectiveTypes,
      recommendedPlan: plan,
      estimatedAppointments: appts,
      estimatedRevenue: potentialRevenue,
      estimatedBudget: totalCost,
      createdAt: new Date().toISOString(),
    });
    navigate(`/pricing?plan=${plan}`);
  };

  return (
    <section className="px-5 py-16 md:py-20" id="calculateur">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="glass-card-elevated rounded-3xl p-6 md:p-10 space-y-8">
            {/* ═══ HEADER ═══ */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-accent/10 text-accent text-sm font-semibold">
                <Brain className="h-3.5 w-3.5" /> Calculateur IA
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Simulez votre croissance avec UNPRO
              </h2>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                Découvrez combien de rendez-vous garantis vous pouvez transformer en revenus.
              </p>
            </div>

            {/* ═══ INPUTS ═══ */}
            {/* Revenue Goal */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Objectif de revenu mensuel</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">2 000 $</span>
                <motion.span
                  key={revenueGoal[0]}
                  initial={{ scale: 1.1, opacity: 0.7 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-2xl font-extrabold text-primary"
                >
                  {revenueGoal[0].toLocaleString()} $
                </motion.span>
                <span className="text-xs text-muted-foreground">200 000 $</span>
              </div>
              <Slider value={revenueGoal} onValueChange={setRevenueGoal} min={2000} max={200000} step={1000} />
            </div>

            {/* City + Trade — Supabase-connected */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Ville principale</span>
                </div>
                <Select value={citySlug} onValueChange={setCitySlug}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Sélectionner une ville..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {(cities ?? []).map((c: any) => (
                      <SelectItem key={c.slug} value={c.slug}>{c.name_fr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Métier / Spécialité</span>
                </div>
                <Select value={tradeSlug} onValueChange={setTradeSlug}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Sélectionner un métier..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {(trades ?? []).map((t: any) => (
                      <SelectItem key={t.slug} value={t.slug}>{t.name_fr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* JVE data notice */}
            {jveEstimate && !jveEstimate.error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2 border border-border">
                <Sparkles className="h-3 w-3 text-primary" />
                Valeur moyenne auto-remplie depuis les données du marché ({Math.round(jveEstimate.final_avg_value).toLocaleString()} $)
                {jveEstimate.confidence_score && <Badge variant="outline" className="text-[10px] ml-auto">{jveEstimate.confidence_score}% confiance</Badge>}
              </motion.div>
            )}

            {/* Avg Job Value */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Valeur moyenne par projet</span>
                {autoOptimizeEnabled && effectiveValue !== avgJobValue[0] && (
                  <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px]">
                    <ChevronUp className="h-2.5 w-2.5 mr-0.5" /> Optimisé
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">500 $</span>
                <motion.span key={effectiveValue} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="text-xl font-bold text-foreground">
                  {effectiveValue.toLocaleString()} $
                </motion.span>
                <span className="text-xs text-muted-foreground">100 000 $</span>
              </div>
              <Slider
                value={[autoOptimizeEnabled ? effectiveValue : avgJobValue[0]]}
                onValueChange={(v) => { if (!autoOptimizeEnabled) setAvgJobValue(v); }}
                min={500} max={100000} step={500}
                disabled={autoOptimizeEnabled}
              />
            </div>

            {/* Conversion Rate */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Taux de conversion</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">10 %</span>
                <span className="text-xl font-bold text-foreground">{conversionRate[0]} %</span>
                <span className="text-xs text-muted-foreground">80 %</span>
              </div>
              <Slider value={conversionRate} onValueChange={setConversionRate} min={10} max={80} step={5} />
            </div>

            {/* Monthly Capacity */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Capacité mensuelle (rendez-vous)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">5</span>
                <span className="text-xl font-bold text-foreground">{capacity[0]}</span>
                <span className="text-xs text-muted-foreground">150</span>
              </div>
              <Slider value={capacity} onValueChange={setCapacity} min={5} max={150} step={1} />
            </div>

            {/* Project Types */}
            <div className="space-y-3">
              <span className="text-sm font-semibold text-foreground">Types de projets visés</span>
              <div className="flex flex-wrap gap-2">
                {PROJECT_TYPES.map((pt) => {
                  const isActive = effectiveTypes.includes(pt.id);
                  const wasAdded = autoOptimizeEnabled && !projectTypes.includes(pt.id) && effectiveTypes.includes(pt.id);
                  return (
                    <button
                      key={pt.id}
                      onClick={() => { if (!autoOptimizeEnabled) toggleProjectType(pt.id); }}
                      disabled={autoOptimizeEnabled}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm ${
                        isActive
                          ? wasAdded
                            ? "bg-accent/10 border-accent/30 text-accent font-semibold ring-1 ring-accent/30"
                            : "bg-primary/10 border-primary/30 text-primary font-semibold"
                          : "bg-muted/30 border-border text-muted-foreground hover:border-primary/20"
                      } ${autoOptimizeEnabled ? "opacity-80 cursor-default" : ""}`}
                    >
                      <span className="font-bold">{pt.label}</span>
                      <span className="text-[10px] opacity-70">{pt.price}</span>
                      {wasAdded && <Sparkles className="h-3 w-3 text-accent" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ═══ AUTO-OPTIMIZE TOGGLE ═══ */}
            <div className="flex items-center justify-between rounded-2xl bg-muted/50 border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Brain className="h-4.5 w-4.5 text-accent" />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-foreground cursor-pointer">
                    Optimisation automatique
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Le système ajuste projets et budget pour maximiser la rentabilité
                  </p>
                </div>
              </div>
              <Switch checked={autoOptimizeEnabled} onCheckedChange={setAutoOptimizeEnabled} />
            </div>

            {/* ═══ RESULTS PANEL ═══ */}
            <motion.div
              key={`${plan}-${appts}-${effectiveValue}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-primary/5 via-card to-accent/5 border border-primary/20 p-6 space-y-6"
            >
              {/* Plan Badge */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Plan recommandé</p>
                <div className="flex items-center justify-center gap-2">
                  <PlanIcon className={`h-6 w-6 ${PLAN_META[plan]?.color}`} />
                  <span className="text-3xl font-extrabold text-foreground">{planLabel}</span>
                </div>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard label="Rendez-vous" value={`${appts}`} sub={capacityLimited ? `/${apptsNeeded} nécessaires` : "/mois"} />
                <KPICard label="Coût total" value={`${Math.round(totalCost).toLocaleString()} $`} sub="/mois" />
                <KPICard label="Revenu potentiel" value={`${Math.round(potentialRevenue).toLocaleString()} $`} accent="success" sub="/mois" />
                <KPICard label="ROI estimé" value={`${roi}x`} accent="success" icon={<TrendingUp className="h-4 w-4" />} />
              </div>

              {/* Progress Bar — Goal Attainment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progression vers l'objectif</span>
                  <span className="font-bold text-foreground">{goalProgress} %</span>
                </div>
                <Progress value={goalProgress} className="h-3" />
              </div>

              {/* Revenue vs Cost Chart */}
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={55} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      formatter={(v: number) => [`${v.toLocaleString()} $`]}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                    />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={20}>
                      {chartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Profit line */}
              <div className={`text-center text-sm font-semibold ${profit >= 0 ? "text-success" : "text-destructive"}`}>
                {profit >= 0 ? "+" : ""}{Math.round(profit).toLocaleString()} $ de profit estimé
              </div>
            </motion.div>

            {/* ═══ AI SUGGESTIONS ═══ */}
            <AnimatePresence>
              {suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <span className="text-sm font-semibold text-foreground">Stratégie recommandée</span>
                  </div>
                  {suggestions.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`flex items-start gap-3 rounded-xl p-3 border text-sm ${
                        s.type === "upgrade"
                          ? "bg-primary/5 border-primary/20 text-foreground"
                          : s.type === "optimize"
                            ? "bg-accent/5 border-accent/20 text-foreground"
                            : "bg-muted/50 border-border text-muted-foreground"
                      }`}
                    >
                      <s.icon className={`h-4 w-4 mt-0.5 shrink-0 ${
                        s.type === "upgrade" ? "text-primary" : s.type === "optimize" ? "text-accent" : "text-muted-foreground"
                      }`} />
                      <span>{s.text}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ═══ CAPACITY WARNING ═══ */}
            {capacityLimited && (
              <div className="flex items-center gap-3 rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-sm text-foreground">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <span>
                  Votre objectif nécessite <strong>{apptsNeeded}</strong> rendez-vous/mois mais votre capacité est de <strong>{capacity[0]}</strong>. Revenu limité à <strong>{Math.round(potentialRevenue).toLocaleString()} $</strong> au lieu de <strong>{revenueGoal[0].toLocaleString()} $</strong>.
                </span>
              </div>
            )}

            {/* ═══ CTA ═══ */}
            {plan === "signature" ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Vos objectifs nécessitent un accompagnement personnalisé.
                </p>
                <Button size="lg" className="rounded-2xl h-13 px-8 shadow-glow" onClick={() => navigate("/pricing?plan=signature")}>
                  Parler à l'équipe UNPRO <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Button size="lg" className="w-full rounded-2xl h-13 text-base shadow-glow" onClick={handleContinue}>
                  Commencer avec le plan {planLabel} <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  1 projet = 1 entrepreneur recommandé. Rendez-vous exclusifs, jamais partagés.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Sub-components ───

function KPICard({ label, value, sub, accent, icon }: {
  label: string; value: string; sub?: string; accent?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`text-center p-3 rounded-xl border ${
      accent === "success"
        ? "bg-success/5 border-success/20"
        : "bg-card/80 border-border"
    }`}>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <div className="flex items-center justify-center gap-1">
        {icon}
        <motion.p
          key={value}
          initial={{ scale: 1.1, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`text-xl font-bold ${accent === "success" ? "text-success" : "text-foreground"}`}
        >
          {value}
        </motion.p>
      </div>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
