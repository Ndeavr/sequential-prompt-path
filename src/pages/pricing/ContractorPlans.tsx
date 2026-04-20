/**
 * UNPRO — Contractor Plans (refonte haute conversion)
 * Layout : 3 plans mensuels (Pro / Premium featured / Élite) + bloc Founder one-time scarcity.
 * Premium visuellement dominant. French first. Plans dynamiques via plan_catalog.
 */
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, ArrowRight, HardHat, TrendingUp, Star, Crown,
  CalendarCheck, Sparkles, Trophy, Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import {
  usePlanCatalog,
  formatPlanPrice,
  getYearlySavingsPercent,
  getMonthlyEquivalent,
  type BillingInterval,
  type CatalogPlan,
} from "@/hooks/usePlanCatalog";
import ModalRendezVousValueExplanation from "@/components/pricing/ModalRendezVousValueExplanation";
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
  pro_acq: TrendingUp,
  premium_acq: Star,
  elite_acq: Crown,
  founder_lifetime: Trophy,
};

// ─── Subscription card (Pro / Premium / Élite) ───
function PlanCard({
  plan, index, isRecommended, interval, onCheckout, onOpenRdvModal,
}: {
  plan: CatalogPlan;
  index: number;
  isRecommended: boolean;
  interval: BillingInterval;
  onCheckout: (planCode: string) => void;
  onOpenRdvModal: () => void;
}) {
  const isFeatured = plan.highlighted;
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

          {interval === "year" && savings > 0 && (
            <p className="text-xs font-semibold text-success mb-2">
              Économisez {savings}% en facturation annuelle
            </p>
          )}
          {interval === "month" && savings > 0 && plan.monthlyPrice > 0 && (
            <p className="text-xs text-muted-foreground mb-2">
              ou {getMonthlyEquivalent(plan)}/mois en annuel{" "}
              <span className="text-success font-semibold">(-{savings}%)</span>
            </p>
          )}

          <p className="text-sm text-foreground/80 mb-5 leading-relaxed font-medium">{plan.tagline}</p>

          {/* CTA — placed early for conversion */}
          <Button
            size="lg"
            variant={isFeatured ? "default" : "outline"}
            className={cn(
              "w-full rounded-2xl text-sm font-semibold mb-5 h-12",
              isFeatured && "shadow-glow bg-primary hover:bg-primary/90",
            )}
            onClick={() => onCheckout(plan.code)}
          >
            Choisir {plan.name}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>

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

// ─── Founder one-time scarcity block ───
function FounderBlock({ plan, onCheckout }: { plan: CatalogPlan; onCheckout: (code: string) => void }) {
  const price = plan.oneTimePrice || 199700;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-12 max-w-4xl mx-auto"
    >
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-accent/10 via-card to-primary/10 border-2 border-accent/30 p-6 md:p-10">
        {/* Glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative grid md:grid-cols-[1.4fr_1fr] gap-8 items-center">
          <div>
            <Badge className="bg-accent text-accent-foreground mb-4 text-[11px] px-3 py-1 font-bold uppercase tracking-wider">
              <Trophy className="h-3 w-3 mr-1.5 fill-current" /> {plan.badgeText || "30 places seulement"}
            </Badge>
            <h3 className="text-2xl md:text-3xl font-extrabold text-foreground mb-2 leading-tight">
              Devenez membre <span className="text-gradient">Founder</span>
            </h3>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              {plan.tagline} Verrouillez vos avantages avant le scale public d'UNPRO au Québec.
            </p>

            <ul className="space-y-2 mb-6">
              {plan.features.slice(0, 5).map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-card/80 backdrop-blur border border-border/60 p-6 text-center">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Paiement unique
            </p>
            <div className="flex items-baseline justify-center gap-1 mb-1">
              <span className="text-5xl font-extrabold text-foreground">{formatPlanPrice(price)}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-5">CAD · taxes en sus</p>

            <Button
              size="lg"
              className="w-full rounded-2xl h-12 text-sm font-semibold shadow-glow bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => onCheckout(plan.code)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Devenir Founder
            </Button>

            <p className="text-[11px] text-muted-foreground mt-3">
              Avantages verrouillés à vie · Onboarding concierge
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main component ───
export default function ContractorPlans({ preSelectedPlan }: { preSelectedPlan?: string | null }) {
  const [interval, setIntervalState] = useState<BillingInterval>("month");
  const [rdvModalOpen, setRdvModalOpen] = useState(false);
  const { data: plans, isLoading } = usePlanCatalog();
  const navigate = useNavigate();

  const handleCheckout = async (planCode: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = `/signup?type=contractor&plan=${planCode}`;
      return;
    }
    navigate(`/checkout/native/${planCode}?billing=${interval}`);
  };

  // Split: subscription plans vs one-time (founder)
  const subscriptionPlans = (plans ?? []).filter((p) => p.billingMode !== "one_time");
  const founderPlan = (plans ?? []).find((p) => p.billingMode === "one_time");

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

        {/* 3 subscription plans */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[560px] rounded-3xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 items-stretch">
            {subscriptionPlans.map((plan, i) => (
              <PlanCard
                key={plan.code}
                plan={plan}
                index={i}
                isRecommended={preSelectedPlan === plan.code}
                interval={interval}
                onCheckout={handleCheckout}
                onOpenRdvModal={() => setRdvModalOpen(true)}
              />
            ))}
          </div>
        )}

        {/* Signature contact note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-muted-foreground mt-8"
        >
          Besoin d'un mode domination ?{" "}
          <Link to="/contact?subject=signature" className="text-primary font-semibold hover:underline">
            Parlez-nous des plans Signature
          </Link>
        </motion.p>

        {/* Trust strip */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mt-8 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" /> Activation rapide
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Sans engagement long
          </span>
          <span className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-accent" /> Rendez-vous exclusifs
          </span>
        </div>

        {/* Founder one-time block */}
        {founderPlan && <FounderBlock plan={founderPlan} onCheckout={handleCheckout} />}
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
