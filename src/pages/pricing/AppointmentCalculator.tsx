/**
 * UNPRO — Connected Profit Calculator
 * Full inputs → plan recommendation → redirect to pricing with pre-selection
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calculator, TrendingUp, ArrowRight, Target, MapPin, Briefcase, DollarSign,
  BarChart3, Zap, Crown, Star, Users, Shield,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  saveCalculatorSession,
  recommendPlan,
  estimateAppointments,
  estimateBudget,
} from "@/services/calculatorSessionService";

const CATEGORIES = [
  "Toiture", "Isolation", "Plomberie", "Électricité", "Chauffage", "Climatisation",
  "Thermopompe", "Rénovation générale", "Cuisine", "Salle de bain", "Sous-sol",
  "Peinture", "Planchers", "Portes-Fenêtres", "Excavation", "Fondation",
  "Drain français", "Paysagement", "Béton", "Maçonnerie", "Extermination",
  "Inspection bâtiment", "Notaire", "Courtier immobilier", "Alarme-Domotique",
];

const PROJECT_TYPES = [
  { id: "S", label: "S", desc: "Petit projet", price: "15 $" },
  { id: "M", label: "M", desc: "Projet moyen", price: "50 $" },
  { id: "L", label: "L", desc: "Grand projet", price: "120 $" },
  { id: "XL", label: "XL", desc: "Très grand projet", price: "250 $" },
  { id: "XXL", label: "XXL", desc: "Projet majeur", price: "500 $" },
];

const PLAN_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  recrue: { icon: Users, color: "text-muted-foreground", label: "Recrue" },
  pro: { icon: TrendingUp, color: "text-primary", label: "Pro" },
  premium: { icon: Star, color: "text-primary", label: "Premium" },
  elite: { icon: Crown, color: "text-accent", label: "Élite" },
  signature: { icon: Shield, color: "text-secondary", label: "Signature" },
};

export default function AppointmentCalculator() {
  const navigate = useNavigate();
  const [revenueGoal, setRevenueGoal] = useState([15000]);
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [avgJobValue, setAvgJobValue] = useState([8000]);
  const [conversionRate, setConversionRate] = useState([30]);
  const [capacity, setCapacity] = useState([15]);
  const [projectTypes, setProjectTypes] = useState<string[]>(["S", "M", "L"]);

  const toggleProjectType = (id: string) => {
    setProjectTypes((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const plan = useMemo(
    () => recommendPlan({ revenueGoal: revenueGoal[0], projectTypes, monthlyCapacity: capacity[0], city }),
    [revenueGoal, projectTypes, capacity, city]
  );

  const appts = useMemo(
    () => estimateAppointments(revenueGoal[0], avgJobValue[0], conversionRate[0] / 100),
    [revenueGoal, avgJobValue, conversionRate]
  );

  const budget = useMemo(() => estimateBudget(plan, appts), [plan, appts]);
  const potentialRevenue = appts * avgJobValue[0] * (conversionRate[0] / 100);
  const roi = budget > 0 ? Math.round(potentialRevenue / budget) : 0;

  const PlanIcon = PLAN_META[plan]?.icon ?? Users;
  const planLabel = PLAN_META[plan]?.label ?? plan;

  const handleContinue = () => {
    saveCalculatorSession({
      revenueGoal: revenueGoal[0],
      city,
      category,
      specialty,
      avgJobValue: avgJobValue[0],
      conversionRate: conversionRate[0],
      monthlyCapacity: capacity[0],
      projectTypes,
      recommendedPlan: plan,
      estimatedAppointments: appts,
      estimatedRevenue: potentialRevenue,
      estimatedBudget: budget,
      createdAt: new Date().toISOString(),
    });
    navigate(`/pricing?plan=${plan}`);
  };

  return (
    <section className="px-5 py-16" id="calculateur">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="glass-card-elevated rounded-3xl p-6 md:p-10 space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-accent/10 text-accent text-sm font-semibold">
                <Calculator className="h-3.5 w-3.5" /> Calculateur de revenus
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Estimez votre potentiel de revenus
              </h2>
              <p className="text-sm text-muted-foreground">
                Recevez des rendez-vous garantis exclusifs. Pas des leads partagés.
              </p>
            </div>

            {/* Revenue Goal */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Objectif de revenu mensuel</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">5 000 $</span>
                <span className="text-2xl font-extrabold text-primary">{revenueGoal[0].toLocaleString()} $</span>
                <span className="text-xs text-muted-foreground">60 000 $</span>
              </div>
              <Slider value={revenueGoal} onValueChange={setRevenueGoal} min={5000} max={60000} step={1000} />
            </div>

            {/* City + Category Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Ville principale</span>
                </div>
                <Input
                  placeholder="Ex: Laval, Montréal..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Catégorie</span>
                </div>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Specialty */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-foreground">Spécialité (optionnel)</span>
              <Input
                placeholder="Ex: bardeaux, membrane, urgence..."
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="rounded-xl"
              />
            </div>

            {/* Avg Job Value */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Valeur moyenne par projet</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">1 000 $</span>
                <span className="text-xl font-bold text-foreground">{avgJobValue[0].toLocaleString()} $</span>
                <span className="text-xs text-muted-foreground">50 000 $</span>
              </div>
              <Slider value={avgJobValue} onValueChange={setAvgJobValue} min={1000} max={50000} step={500} />
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
                <span className="text-xs text-muted-foreground">3</span>
                <span className="text-xl font-bold text-foreground">{capacity[0]}</span>
                <span className="text-xs text-muted-foreground">50</span>
              </div>
              <Slider value={capacity} onValueChange={setCapacity} min={3} max={50} step={1} />
            </div>

            {/* Project Types */}
            <div className="space-y-3">
              <span className="text-sm font-semibold text-foreground">Types de projets visés</span>
              <div className="flex flex-wrap gap-2">
                {PROJECT_TYPES.map((pt) => (
                  <button
                    key={pt.id}
                    onClick={() => toggleProjectType(pt.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-sm ${
                      projectTypes.includes(pt.id)
                        ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                        : "bg-muted/30 border-border text-muted-foreground hover:border-primary/20"
                    }`}
                  >
                    <span className="font-bold">{pt.label}</span>
                    <span className="text-[10px] opacity-70">{pt.price}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ═══ RESULTS ═══ */}
            <motion.div
              key={`${plan}-${appts}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-gradient-to-br from-primary/5 via-card to-accent/5 border border-primary/20 p-6 space-y-5"
            >
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Plan recommandé</p>
                <div className="flex items-center justify-center gap-2">
                  <PlanIcon className={`h-6 w-6 ${PLAN_META[plan]?.color}`} />
                  <span className="text-3xl font-extrabold text-foreground">{planLabel}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 rounded-xl bg-card/80 border border-border">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Rendez-vous estimés</p>
                  <p className="text-xl font-bold text-foreground">{appts}</p>
                  <p className="text-[10px] text-muted-foreground">/mois</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-card/80 border border-border">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Budget mensuel</p>
                  <p className="text-xl font-bold text-foreground">{budget.toLocaleString()} $</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-card/80 border border-border">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Revenu potentiel</p>
                  <p className="text-xl font-bold text-success">{Math.round(potentialRevenue).toLocaleString()} $</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-[10px] text-muted-foreground mb-0.5">ROI estimé</p>
                  <div className="flex items-center justify-center gap-1">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-xl font-bold text-success">{roi}x</span>
                  </div>
                </div>
              </div>

              {plan === "signature" ? (
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Vos objectifs nécessitent un accompagnement personnalisé.
                  </p>
                  <Button size="lg" className="rounded-2xl h-13 px-8 shadow-glow" onClick={() => navigate("/pricing?plan=signature")}>
                    Parler à l'équipe UNPRO <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <Button size="lg" className="w-full rounded-2xl h-13 text-base shadow-glow" onClick={handleContinue}>
                  Continuer avec le plan {planLabel} <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
