/**
 * UNPRO — Dynamic Pricing Calculator Page
 * Full pricing engine: category + market + plan + rdv + taxes = checkout
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, MapPin, Building2, Target, TrendingUp, ArrowRight, Sparkles, ChevronDown, Check, Crown, Zap, Star, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  calculatePricing,
  loadPricingCategories,
  loadPricingMarkets,
  loadPricingPlans,
  loadRdvPackages,
  type PricingCalcRequest,
  type PricingCalcResult,
} from "@/services/pricingEngineService";

const RDV_OPTIONS = [0, 10, 20, 40, 60];
const PLAN_ICONS: Record<string, React.ElementType> = {
  recrue: Sparkles,
  pro: Zap,
  premium: Star,
  elite: Crown,
  signature: Crown,
};

export default function PagePricingCalculator() {
  const navigate = useNavigate();

  // Reference data
  const [categories, setCategories] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [rdvPackages, setRdvPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [categorySlug, setCategorySlug] = useState("");
  const [marketSlug, setMarketSlug] = useState("");
  const [planCode, setPlanCode] = useState("pro");
  const [billingPeriod, setBillingPeriod] = useState<"month" | "year">("month");
  const [rdvCount, setRdvCount] = useState(10);
  const [revenueGoal, setRevenueGoal] = useState(10000);
  const [capacity, setCapacity] = useState(15);
  const [closeRate, setCloseRate] = useState(25);
  const [avgTicket, setAvgTicket] = useState(5000);

  // Results
  const [result, setResult] = useState<PricingCalcResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [step, setStep] = useState<"form" | "result">("form");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cats, mkts, pls, pkgs] = await Promise.all([
          loadPricingCategories(),
          loadPricingMarkets(),
          loadPricingPlans(),
          loadRdvPackages(),
        ]);
        setCategories(cats);
        setMarkets(mkts);
        setPlans(pls);
        setRdvPackages(pkgs);
      } catch (e) {
        console.error("Load error:", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Auto-set avg ticket from category
  useEffect(() => {
    const cat = categories.find((c) => c.slug === categorySlug);
    if (cat) {
      setAvgTicket(Math.round((cat.average_contract_value_min + cat.average_contract_value_max) / 2));
      // Auto-set min plan
      const floorPlan = cat.base_plan_floor || "recrue";
      const planOrder = ["recrue", "pro", "premium", "elite", "signature"];
      if (planOrder.indexOf(planCode) < planOrder.indexOf(floorPlan)) {
        setPlanCode(floorPlan);
      }
    }
  }, [categorySlug, categories]);

  const handleCalculate = async () => {
    if (!categorySlug || !marketSlug) {
      toast.error("Sélectionnez votre catégorie et votre ville.");
      return;
    }
    setCalculating(true);
    try {
      const req: PricingCalcRequest = {
        category_slug: categorySlug,
        market_slug: marketSlug,
        selected_plan_code: planCode,
        selected_billing_period: billingPeriod,
        selected_rendezvous_count: rdvCount,
        revenue_goal_monthly: revenueGoal,
        capacity_monthly: capacity,
        close_rate_percent: closeRate,
        average_contract_value: avgTicket,
      };
      const res = await calculatePricing(req);
      setResult(res);
      setStep("result");

      // Store for later
      sessionStorage.setItem("unpro_pricing_result", JSON.stringify(res));
    } catch (e: any) {
      toast.error(e.message || "Erreur de calcul");
    } finally {
      setCalculating(false);
    }
  };

  const handleAcceptPlan = () => {
    if (!result?.quote_id) return;
    navigate(`/entrepreneur/plan-result?quote_id=${result.quote_id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden pt-16 pb-8 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4"
          >
            <Calculator className="w-4 h-4" />
            Calculateur de plan intelligent
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-extrabold text-foreground font-display mb-3"
          >
            Votre plan, calculé selon votre marché
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground max-w-xl mx-auto"
          >
            Chaque métier et chaque ville ont un prix différent. Découvrez le vôtre en 30 secondes.
          </motion.p>
        </div>
      </section>

      <AnimatePresence mode="wait">
        {step === "form" ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto px-4 pb-20 space-y-6"
          >
            {/* Category */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Building2 className="w-4 h-4 text-primary" />
                Votre métier
              </div>
              <Select value={categorySlug} onValueChange={setCategorySlug}>
                <SelectTrigger><SelectValue placeholder="Sélectionnez votre catégorie" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>{c.name_fr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Market */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                Votre ville
              </div>
              <Select value={marketSlug} onValueChange={setMarketSlug}>
                <SelectTrigger><SelectValue placeholder="Sélectionnez votre marché" /></SelectTrigger>
                <SelectContent>
                  {markets.map((m) => (
                    <SelectItem key={m.slug} value={m.slug}>
                      {m.city_name}
                      {m.market_tier === "premium" && <span className="ml-1 text-xs text-primary">Premium</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Financial objectives */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-5">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Target className="w-4 h-4 text-primary" />
                Vos objectifs
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Objectif mensuel ($)</Label>
                  <Input
                    type="number"
                    value={revenueGoal}
                    onChange={(e) => setRevenueGoal(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Valeur moy. contrat ($)</Label>
                  <Input
                    type="number"
                    value={avgTicket}
                    onChange={(e) => setAvgTicket(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Capacité mensuelle (projets)</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Slider
                    value={[capacity]}
                    onValueChange={([v]) => setCapacity(v)}
                    min={1}
                    max={50}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm font-bold text-foreground w-8 text-right">{capacity}</span>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Taux de fermeture (%)</Label>
                <div className="flex items-center gap-3 mt-2">
                  <Slider
                    value={[closeRate]}
                    onValueChange={([v]) => setCloseRate(v)}
                    min={5}
                    max={80}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-sm font-bold text-foreground w-8 text-right">{closeRate}%</span>
                </div>
              </div>
            </div>

            {/* Plan selection */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Crown className="w-4 h-4 text-primary" />
                Votre plan
              </div>

              {/* Billing toggle */}
              <div className="flex justify-center">
                <div className="inline-flex bg-muted rounded-xl p-1 gap-1">
                  <button
                    onClick={() => setBillingPeriod("month")}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
                      billingPeriod === "month" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    Mensuel
                  </button>
                  <button
                    onClick={() => setBillingPeriod("year")}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
                      billingPeriod === "year" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    Annuel <span className="text-green-500 font-bold">-15%</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {plans.map((p) => {
                  const Icon = PLAN_ICONS[p.plan_code] || Sparkles;
                  const isSelected = planCode === p.plan_code;
                  return (
                    <button
                      key={p.plan_code}
                      onClick={() => setPlanCode(p.plan_code)}
                      className={cn(
                        "rounded-xl p-3 border text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 mb-1", isSelected ? "text-primary" : "text-muted-foreground")} />
                      <div className="text-xs font-bold text-foreground">{p.plan_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.base_price === 0 ? "Gratuit" : `${p.base_price} $`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rendez-vous add-on */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <TrendingUp className="w-4 h-4 text-primary" />
                Rendez-vous garantis
              </div>
              <div className="grid grid-cols-5 gap-2">
                {RDV_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setRdvCount(n)}
                    className={cn(
                      "rounded-xl py-3 border text-center transition-all",
                      rdvCount === n
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <div className="text-sm font-bold text-foreground">{n === 0 ? "—" : `+${n}`}</div>
                    <div className="text-[10px] text-muted-foreground">RDV/mois</div>
                  </button>
                ))}
              </div>
            </div>

            {/* CTA */}
            <Button
              onClick={handleCalculate}
              disabled={calculating || !categorySlug || !marketSlug}
              className="w-full h-14 rounded-2xl text-base font-bold gap-2"
              size="lg"
            >
              {calculating ? (
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <>
                  Calculer mon plan personnalisé
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </motion.div>
        ) : (
          <PricingResult
            result={result!}
            onAccept={handleAcceptPlan}
            onModify={() => setStep("form")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Result Section ───
function PricingResult({
  result,
  onAccept,
  onModify,
}: {
  result: PricingCalcResult;
  onAccept: () => void;
  onModify: () => void;
}) {
  const { amounts, projections, badges, category, market, multipliers, selected_plan, billing_period } = result;

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto px-4 pb-20 space-y-5"
    >
      {/* Badges */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {badges.map((b) => (
            <span key={b} className="px-3 py-1 rounded-full bg-accent/20 text-accent-foreground text-xs font-semibold">
              {b}
            </span>
          ))}
        </div>
      )}

      {/* Recommendation */}
      {result.recommended_plan_code !== selected_plan.code && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-foreground">Plan minimum recommandé : {result.recommended_plan_code}</p>
            <p className="text-xs text-muted-foreground mt-1">Pour votre catégorie ({category.name}), nous recommandons au minimum le plan {result.recommended_plan_code}.</p>
          </div>
        </div>
      )}

      {/* Plan Card */}
      <div className="bg-card rounded-2xl border border-primary/20 shadow-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{category.name} · {market.name}</p>
            <h2 className="text-xl font-extrabold text-foreground">
              Plan {selected_plan.name}
            </h2>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-primary">
              {amounts.total.toFixed(2)} $
            </div>
            <p className="text-xs text-muted-foreground">/{billing_period === "year" ? "an" : "mois"} TTC</p>
          </div>
        </div>

        {/* Cost breakdown */}
        <div className="space-y-2 pt-3 border-t border-border">
          <Row label={`Plan ${selected_plan.name} (base)`} value={`${amounts.base_plan.toFixed(2)} $`} />
          <Row label={`Ajustement marché (×${multipliers.market.toFixed(2)})`} value={`${amounts.adjusted_plan.toFixed(2)} $`} />
          {amounts.rendezvous > 0 && (
            <Row label={`Rendez-vous garantis (${result.projections.total_rendezvous})`} value={`${amounts.rendezvous.toFixed(2)} $`} />
          )}
          {amounts.override_adjustment !== 0 && (
            <Row label="Ajustement" value={`${amounts.override_adjustment > 0 ? "+" : ""}${amounts.override_adjustment.toFixed(2)} $`} />
          )}
          <div className="border-t border-border pt-2">
            <Row label="Sous-total" value={`${amounts.subtotal.toFixed(2)} $`} bold />
          </div>
          <Row label="TPS (5%)" value={`${amounts.gst.toFixed(2)} $`} muted />
          <Row label="TVQ (9.975%)" value={`${amounts.qst.toFixed(2)} $`} muted />
          <div className="border-t border-border pt-2">
            <Row label="Total" value={`${amounts.total.toFixed(2)} $`} bold primary />
          </div>
        </div>
      </div>

      {/* Projections */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Projections de revenus
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <ProjectionCard label="Rendez-vous / mois" value={projections.total_rendezvous.toString()} />
          <ProjectionCard label="Conversions estimées" value={projections.estimated_conversions.toString()} />
          <ProjectionCard label="Revenus estimés" value={`${projections.estimated_revenue.toLocaleString()} $`} primary />
          <ProjectionCard label="ROI estimé" value={`${projections.estimated_roi}×`} primary />
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-2">
        <h3 className="text-sm font-bold text-foreground">Pourquoi ce prix ?</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Le coût de votre plan est calculé en fonction de la compétitivité de votre marché
          ({market.name}, tier {market.tier}), de la valeur moyenne des contrats dans votre secteur
          ({category.name}) et du nombre de rendez-vous garantis sélectionnés. Le multiplicateur
          marché de {multipliers.market.toFixed(2)}× reflète le coût d'acquisition client dans
          votre zone.
        </p>
      </div>

      {/* CTAs */}
      <div className="space-y-3">
        <Button onClick={onAccept} className="w-full h-14 rounded-2xl text-base font-bold gap-2" size="lg">
          Activer ce plan
          <ArrowRight className="w-5 h-5" />
        </Button>
        <Button onClick={onModify} variant="ghost" className="w-full text-sm">
          Modifier mes paramètres
        </Button>
      </div>
    </motion.div>
  );
}

function Row({ label, value, bold, muted, primary }: { label: string; value: string; bold?: boolean; muted?: boolean; primary?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={cn("text-xs", bold ? "font-bold text-foreground" : muted ? "text-muted-foreground" : "text-foreground")}>{label}</span>
      <span className={cn("text-xs font-mono", bold ? "font-bold" : "", primary ? "text-primary font-bold" : "text-foreground")}>{value}</span>
    </div>
  );
}

function ProjectionCard({ label, value, primary }: { label: string; value: string; primary?: boolean }) {
  return (
    <div className="bg-muted/30 rounded-xl p-3 text-center">
      <div className={cn("text-lg font-extrabold", primary ? "text-primary" : "text-foreground")}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
