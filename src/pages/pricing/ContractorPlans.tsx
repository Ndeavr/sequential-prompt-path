/**
 * UNPRO — Contractor Plans (refonte haute conversion)
 * Layout : Pro / Premium (featured) / Élite / Signature (apply).
 * Recrue accessible via accordéon discret. Premium visuellement dominant.
 * Plans dynamiques via plan_catalog. Aucune référence Founder publique.
 */
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, ArrowRight, HardHat, TrendingUp, Star, Crown,
  CalendarCheck, Shield, Zap, ChevronDown, Sprout, Mic,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { saveAuthIntent } from "@/services/auth/authIntentService";
import {
  usePlanCatalog,
  formatPlanPrice,
  getYearlySavingsPercent,
  getMonthlyEquivalent,
  type BillingInterval,
  type CatalogPlan,
} from "@/hooks/usePlanCatalog";
import ModalRendezVousValueExplanation from "@/components/pricing/ModalRendezVousValueExplanation";
import InlineStripeCheckout from "@/components/pricing/InlineStripeCheckout";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5 },
  }),
};

const PLAN_ICONS: Record<string, React.ElementType> = {
  recrue: Sprout,
  pro: TrendingUp,
  premium: Star,
  elite: Crown,
  signature: Shield,
};

const SIGNATURE_CODES = ["signature"];

// ─── Subscription card (Pro / Premium / Élite / Signature) ───
function PlanCard({
  plan, index, isRecommended, interval, onCheckout, onApply, onOpenRdvModal,
}: {
  plan: CatalogPlan;
  index: number;
  isRecommended: boolean;
  interval: BillingInterval;
  onCheckout: (planCode: string) => void;
  onApply: (planCode: string) => void;
  onOpenRdvModal: () => void;
}) {
  const isFeatured = plan.highlighted;
  const isSignature = SIGNATURE_CODES.includes(plan.code);
  const Icon = PLAN_ICONS[plan.code] || TrendingUp;

  const monthlyPrice = interval === "year" ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
  const savings = getYearlySavingsPercent(plan);

  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      data-plan={plan.code}
      className={cn(
        "relative",
        // Premium dominant: scaled up on desktop, stays full width on mobile
        isFeatured && "lg:scale-[1.05] lg:-my-2 z-10",
      )}
    >
      <div
        className={cn(
          "rounded-3xl p-6 md:p-7 h-full flex flex-col transition-all duration-300 hover:-translate-y-1 relative overflow-hidden",
          isFeatured
            ? "bg-gradient-to-br from-card via-card to-primary/5 border-2 border-primary/50 shadow-glow"
            : "bg-card border border-border/60 hover:border-border",
          isRecommended && !isFeatured && "ring-2 ring-accent/40",
        )}
      >
        {/* Featured glow */}
        {isFeatured && (
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        )}

        {/* Top badge */}
        {isFeatured && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <Badge className="bg-primary text-primary-foreground shadow-glow text-[11px] px-3.5 py-1 font-bold uppercase tracking-wider">
              <Star className="h-3 w-3 mr-1 fill-current" /> Le plus populaire
            </Badge>
          </div>
        )}
        {isRecommended && !isFeatured && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <Badge className="bg-accent text-accent-foreground shadow-glow text-[11px] px-3 py-1">
              ⭐ Recommandé pour vous
            </Badge>
          </div>
        )}

        <div className="relative">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <div
              className={cn(
                "h-9 w-9 rounded-xl flex items-center justify-center",
                isFeatured ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <h3 className={cn("font-bold text-xl", isFeatured ? "text-foreground" : "text-foreground")}>
              {plan.name}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">{plan.shortPitch}</p>

          {/* Price */}
          <div className="mb-1 flex items-baseline gap-1">
            {isSignature && (
              <span className="text-xs text-muted-foreground mr-0.5">À partir de</span>
            )}
            <span
              className={cn(
                "font-extrabold tracking-tight",
                isFeatured ? "text-5xl text-foreground" : "text-4xl text-foreground",
              )}
            >
              {formatPlanPrice(monthlyPrice)}
            </span>
            <span className="text-muted-foreground text-sm">/mois</span>
          </div>

          {!isSignature && interval === "year" && savings > 0 && (
            <p className="text-xs font-semibold text-success mb-2">
              Économisez {savings}% en facturation annuelle
            </p>
          )}
          {!isSignature && interval === "month" && savings > 0 && plan.monthlyPrice > 0 && (
            <p className="text-xs text-muted-foreground mb-2">
              ou {getMonthlyEquivalent(plan)}/mois en annuel{" "}
              <span className="text-success font-semibold">(-{savings}%)</span>
            </p>
          )}
          {isSignature && (
            <p className="text-xs text-muted-foreground mb-2">
              Tarification sur mesure · Territoire & équipes
            </p>
          )}

          <p className="text-sm text-foreground/80 mb-3 leading-relaxed font-medium">{plan.tagline}</p>

          {/* ROI projection — high-conversion framing */}
          {plan.appointmentsIncluded > 0 && !isSignature && (
            <div className={cn(
              "rounded-xl px-3 py-2.5 mb-5 border",
              isFeatured
                ? "bg-primary/8 border-primary/20"
                : "bg-success/5 border-success/15",
            )}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                Potentiel de revenu / mois
              </p>
              <p className={cn(
                "text-base font-extrabold",
                isFeatured ? "text-primary" : "text-success",
              )}>
                ≈ {(plan.appointmentsIncluded * 2500).toLocaleString()} $ – {(plan.appointmentsIncluded * 6000).toLocaleString()} $
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Basé sur {plan.appointmentsIncluded} RDV exclusifs × valeur moyenne projet
              </p>
            </div>
          )}
          {isSignature && (
            <div className="rounded-xl px-3 py-2.5 mb-5 border bg-accent/5 border-accent/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                Mode domination
              </p>
              <p className="text-base font-extrabold text-accent">
                50 à 120 RDV / mois · Multi-territoires
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Onboarding dédié, build IA d'autorité, support VIP
              </p>
            </div>
          )}

          {/* CTA — placed early for conversion */}
          {isSignature ? (
            <>
              <Button
                size="lg"
                variant="outline"
                className="w-full rounded-2xl text-sm font-semibold mb-2 h-12 border-accent/40 hover:bg-accent/10"
                onClick={() => onApply(plan.code)}
              >
                Postuler · Signature
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="w-full rounded-2xl text-xs mb-5 h-9"
              >
                <Link to="/alex">
                  <Mic className="h-3.5 w-3.5 mr-1.5" /> Parler à Alex
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                size="lg"
                variant={isFeatured ? "default" : "outline"}
                className={cn(
                  "w-full rounded-2xl text-sm font-semibold mb-2 h-12",
                  isFeatured && "shadow-glow bg-primary hover:bg-primary/90",
                )}
                onClick={() => onCheckout(plan.code)}
              >
                {isFeatured ? "Activer mes rendez-vous" : `Choisir ${plan.name}`}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <p className="text-[10px] text-center text-muted-foreground mb-5">
                Activation immédiate · Sans engagement long
              </p>
            </>
          )}

          {/* Features */}
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Inclus dans ce plan
          </p>
          <ul className="space-y-2.5 mb-4">
            {plan.features.map((f) => {
              const isRdvFeature = /rendez-vous/i.test(f);
              return (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2
                    className={cn(
                      "h-4 w-4 shrink-0 mt-0.5",
                      isFeatured ? "text-primary" : "text-success",
                    )}
                  />
                  {isRdvFeature ? (
                    <button
                      type="button"
                      onClick={onOpenRdvModal}
                      className="text-xs text-foreground/90 underline decoration-dotted underline-offset-2 hover:text-primary text-left cursor-pointer"
                    >
                      {f}
                    </button>
                  ) : (
                    <span className="text-xs text-foreground/90">{f}</span>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Appointment notes */}
          {plan.appointmentNotes.length > 0 && (
            <div className="border-t border-border/50 pt-3 mb-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CalendarCheck className="h-3 w-3" /> Vos rendez-vous
              </p>
              <ul className="space-y-1.5">
                {plan.appointmentNotes.map((note) => (
                  <li key={note} className="flex items-start gap-2">
                    <span className="text-primary mt-1 text-[8px]">●</span>
                    <span className="text-xs text-muted-foreground">{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Project sizes */}
          {plan.projectSizes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {plan.projectSizes.map((s) => (
                <Badge key={s} variant="outline" className="text-[10px] px-2 py-0.5">
                  {s}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main component ───
export default function ContractorPlans({ preSelectedPlan }: { preSelectedPlan?: string | null }) {
  const [interval, setIntervalState] = useState<BillingInterval>("month");
  const [rdvModalOpen, setRdvModalOpen] = useState(false);
  const [activeCheckout, setActiveCheckout] = useState<{ code: string; name: string; price: number } | null>(null);
  const { data: plans, isLoading } = usePlanCatalog();
  const navigate = useNavigate();

  // Auto-open inline checkout if returning from auth with ?checkout=open
  useEffect(() => {
    if (typeof window === "undefined" || !plans?.length) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "open") return;
    const planCode = params.get("plan");
    const billing = params.get("billing");
    if (billing === "year" || billing === "month") setIntervalState(billing);
    if (!planCode) return;
    const plan = plans.find((p) => p.code === planCode);
    if (!plan) return;
    setActiveCheckout({
      code: planCode,
      name: plan.name,
      price: billing === "year" ? plan.yearlyPrice : plan.monthlyPrice,
    });
    setTimeout(() => {
      document.getElementById("inline-checkout-zone")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  }, [plans]);

  const handleCheckout = async (planCode: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Stay on pricing after auth — return here and auto-open inline checkout.
      const returnPath = `/pricing/entrepreneurs?plan=${planCode}&billing=${interval}&checkout=open`;
      saveAuthIntent({
        returnPath,
        action: "contractor_checkout",
        roleHint: "contractor",
        metadata: { source: "pricing_inline", planCode, billing: interval },
      });
      window.location.href = `/signup?type=contractor&plan=${planCode}&returnTo=${encodeURIComponent(returnPath)}`;
      return;
    }
    // Logged-in: render Embedded Checkout inline — no redirect.
    const plan = (plans ?? []).find((p) => p.code === planCode);
    setActiveCheckout({
      code: planCode,
      name: plan?.name ?? planCode,
      price: interval === "year" ? plan?.yearlyPrice ?? 0 : plan?.monthlyPrice ?? 0,
    });
    setTimeout(() => {
      document.getElementById("inline-checkout-zone")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleApply = (planCode: string) => {
    navigate(`/contact?subject=${planCode}`);
  };

  // Public grid: Pro / Premium / Élite / Signature (position_rank >= 1, subscription only).
  // Recrue (position_rank = 0) stays hidden behind the starter accordion.
  // Founder is private — never rendered here.
  const subscriptionPlans = (plans ?? []).filter(
    (p) => p.billingMode !== "one_time" && p.positionRank >= 1
  );
  const entryPlan = (plans ?? []).find(
    (p) => p.billingMode !== "one_time" && p.positionRank === 0
  );

  // Auto-expand entry plan section if it's the pre-selected/recommended plan
  const [showEntryPlan, setShowEntryPlan] = useState(preSelectedPlan === "recrue");

  return (
    <section className="px-5 py-16 md:py-20 relative" id="plans">
      <div className="absolute inset-0 section-gradient" />
      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-secondary/8 text-secondary text-sm font-semibold mb-4">
            <HardHat className="h-3.5 w-3.5" /> Pour les entrepreneurs
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">
            Développez votre entreprise avec <span className="text-gradient">UNPRO</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-base">
            Rendez-vous qualifiés exclusifs, visibilité IA renforcée et profil bâti pour convertir.
            <br className="hidden md:block" /> <span className="text-foreground/80 font-medium">Moins de soumissions. Plus de contrats.</span>
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-muted rounded-2xl p-1 gap-1">
            <button
              onClick={() => setIntervalState("month")}
              className={cn(
                "px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
                interval === "month"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Mensuel
            </button>
            <button
              onClick={() => setIntervalState("year")}
              className={cn(
                "px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
                interval === "year"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Annuel
              <span className="ml-1.5 text-xs text-success font-bold">-15%</span>
            </button>
          </div>
        </div>

        {/* Inline Stripe Embedded Checkout — appears in place when a plan is selected */}
        <div id="inline-checkout-zone">
          {activeCheckout && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mb-10 max-w-3xl mx-auto"
            >
              <InlineStripeCheckout
                planCode={activeCheckout.code}
                planName={activeCheckout.name}
                interval={interval}
                basePrice={activeCheckout.price}
                onCancel={() => {
                  setActiveCheckout(null);
                  // Strip the checkout query params on cancel.
                  if (typeof window !== "undefined" && window.location.search.includes("checkout=open")) {
                    const url = new URL(window.location.href);
                    url.searchParams.delete("checkout");
                    url.searchParams.delete("plan");
                    url.searchParams.delete("billing");
                    window.history.replaceState({}, "", url.toString());
                  }
                }}
              />
            </motion.div>
          )}
        </div>

        {/* Public subscription plans: Pro · Premium · Élite · Signature (anchor) */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[560px] rounded-3xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 items-stretch">
            {subscriptionPlans.map((plan, i) => (
              <PlanCard
                key={plan.code}
                plan={plan}
                index={i}
                isRecommended={preSelectedPlan === plan.code}
                interval={interval}
                onCheckout={handleCheckout}
                onApply={handleApply}
                onOpenRdvModal={() => setRdvModalOpen(true)}
              />
            ))}
          </div>
        )}

        {/* Hidden entry plan reveal — captures price-sensitive contractors without weakening the main grid */}
        {entryPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-8 max-w-3xl mx-auto"
          >
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowEntryPlan((v) => !v)}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                aria-expanded={showEntryPlan}
              >
                <Sprout className="h-4 w-4 text-success" />
                <span className="underline decoration-dotted underline-offset-4">
                  Vous démarrez plus petit ? Voir le plan d'entrée
                </span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", showEntryPlan && "rotate-180")} />
              </button>
            </div>

            {showEntryPlan && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div
                  data-plan={entryPlan.code}
                  className="mt-5 rounded-3xl bg-card/60 backdrop-blur border border-dashed border-border/70 p-6 md:p-7"
                >
                  <div className="grid md:grid-cols-[1.4fr_1fr] gap-6 items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-lg bg-success/10 text-success flex items-center justify-center">
                          <Sprout className="h-4 w-4" />
                        </div>
                        <h3 className="font-bold text-lg text-foreground">{entryPlan.name}</h3>
                        {entryPlan.badgeText && (
                          <Badge variant="outline" className="text-[10px] ml-1">
                            {entryPlan.badgeText}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground/80 mb-4 leading-relaxed">{entryPlan.tagline}</p>

                      <ul className="space-y-1.5 mb-1">
                        {entryPlan.features.slice(0, 4).map((f) => (
                          <li key={f} className="flex items-start gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                            <span className="text-xs text-muted-foreground">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="text-center md:text-right">
                      <div className="flex items-baseline justify-center md:justify-end gap-1 mb-1">
                        <span className="text-3xl font-extrabold text-foreground">
                          {formatPlanPrice(
                            interval === "year"
                              ? Math.round(entryPlan.yearlyPrice / 12)
                              : entryPlan.monthlyPrice,
                          )}
                        </span>
                        <span className="text-sm text-muted-foreground">/mois</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-4">
                        {entryPlan.appointmentsIncluded} rendez-vous inclus · sans engagement
                      </p>
                      <Button
                        variant="outline"
                        className="w-full md:w-auto rounded-xl"
                        onClick={() => handleCheckout(entryPlan.code)}
                      >
                        Choisir {entryPlan.name}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-[11px] text-center text-muted-foreground mt-4 italic">
                    💡 La plupart des entrepreneurs sérieux démarrent directement au plan{" "}
                    <button
                      onClick={() => {
                        document.querySelector('[data-plan="premium_acq"]')
                          ?.scrollIntoView({ behavior: "smooth", block: "center" });
                        setShowEntryPlan(false);
                      }}
                      className="text-primary font-semibold underline decoration-dotted hover:text-primary/80"
                    >
                      Premium
                    </button>{" "}
                    pour atteindre la rentabilité plus vite.
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}



        {/* Trust strip */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mt-8 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" /> Activation le jour même
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Sans engagement long
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-accent" /> RDV exclusifs · 1 entrepreneur / projet
          </span>
          <span className="flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5 text-warning" /> Places limitées par ville
          </span>
        </div>

      </div>


      <ModalRendezVousValueExplanation
        open={rdvModalOpen}
        onOpenChange={setRdvModalOpen}
        onChoosePlan={() => {
          const recommended = document.querySelector('[data-plan="premium_acq"]');
          recommended?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
      />
    </section>
  );
}
