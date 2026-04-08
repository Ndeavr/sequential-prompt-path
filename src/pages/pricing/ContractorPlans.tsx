/**
 * UNPRO — Contractor Plans with billing toggle, appointments & pre-selection
 * Now fetches plan data dynamically from plan_catalog table.
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, ArrowRight, HardHat, Users, TrendingUp,
  Star, Crown, CalendarCheck, Shield,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useCallback } from "react";
import { usePlanCatalog, formatPlanPrice, getYearlySavingsPercent, getMonthlyEquivalent, type BillingInterval, type CatalogPlan } from "@/hooks/usePlanCatalog";
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
  recrue: Users,
  pro: TrendingUp,
  premium: Star,
  elite: Crown,
  signature: Shield,
};

function PlanCard({ plan, index, isRecommended, interval, onCheckout, onOpenRdvModal }: {
  plan: CatalogPlan;
  index: number;
  isRecommended: boolean;
  interval: BillingInterval;
  onCheckout: (planCode: string) => void;
  onOpenRdvModal: () => void;
}) {
  const isHighlighted = isRecommended || plan.highlighted;
  const Icon = PLAN_ICONS[plan.code] || Users;

  const monthlyPrice = interval === "year" ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
  const savings = getYearlySavingsPercent(plan);

  return (
    <motion.div variants={fadeUp} custom={index} initial="hidden" whileInView="visible" viewport={{ once: true }} data-plan={plan.code}>
      <div className={cn(
        "rounded-2xl p-5 md:p-6 h-full flex flex-col transition-all duration-300 hover:-translate-y-1 relative",
        isHighlighted
          ? "bg-card border-2 border-primary/30 shadow-glow"
          : "glass-card-elevated"
      )}>
        {isRecommended && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-accent text-accent-foreground shadow-glow text-xs px-3 py-1">
              ⭐ Recommandé pour vous
            </Badge>
          </div>
        )}
        {!isRecommended && plan.highlighted && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground shadow-glow text-xs px-3 py-1">
              <Star className="h-3 w-3 mr-1" /> Populaire
            </Badge>
          </div>
        )}

        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-foreground text-lg">{plan.name}</h3>
        </div>

        <div className="mb-1">
          <span className="text-3xl font-extrabold text-foreground">{formatPlanPrice(monthlyPrice)}</span>
          <span className="text-muted-foreground text-sm">/mois</span>
        </div>

        {interval === "year" && savings > 0 && (
          <p className="text-xs font-semibold text-success mb-2">
            Économisez {savings}% vs mensuel
          </p>
        )}
        {interval === "month" && savings > 0 && plan.monthlyPrice > 0 && (
          <p className="text-xs text-muted-foreground mb-2">
            ou {getMonthlyEquivalent(plan)}/mois en annuel{" "}
            <span className="text-success font-semibold">(-{savings}%)</span>
          </p>
        )}
        {plan.monthlyPrice === 0 && <div className="mb-2" />}

        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{plan.tagline}</p>

        {/* Inclus */}
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Inclus</p>
        <ul className="space-y-2 mb-4">
          {plan.features.map((f) => {
            const isRdvFeature = /rendez-vous/i.test(f);
            return (
              <li key={f} className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                {isRdvFeature ? (
                  <button
                    type="button"
                    onClick={onOpenRdvModal}
                    className="text-xs text-primary underline decoration-dotted underline-offset-2 hover:text-primary/80 transition-colors text-left cursor-pointer"
                  >
                    {f}
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">{f}</span>
                )}
              </li>
            );
          })}
        </ul>

        {/* Rendez-vous */}
        <div className="border-t border-border/50 pt-3 mb-4">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CalendarCheck className="h-3 w-3" /> Rendez-vous
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

        {/* Project sizes */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {plan.projectSizes.map((s) => (
            <Badge key={s} variant="outline" className="text-[10px] px-2 py-0.5">{s}</Badge>
          ))}
        </div>

        <div className="mt-auto">
          {plan.monthlyPrice > 0 ? (
            <Button
              size="lg"
              variant={isHighlighted ? "default" : "outline"}
              className={cn("w-full rounded-xl text-sm", isHighlighted && "shadow-glow")}
              onClick={() => onCheckout(plan.code)}
            >
              Choisir {plan.name}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full rounded-xl text-sm"
            >
              <Link to="/signup?type=contractor">Créer mon profil</Link>
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function ContractorPlans({ preSelectedPlan }: { preSelectedPlan?: string | null }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [interval, setInterval] = useState<BillingInterval>("year");
  const { data: plans, isLoading } = usePlanCatalog();

  const handleCheckout = async (planCode: string) => {
    setLoading(planCode);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = `/signup?type=contractor&plan=${planCode}`;
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          planId: planCode,
          billingInterval: interval,
          successUrl: `${window.location.origin}/pro/onboarding?plan=${planCode}&checkout=success`,
          cancelUrl: `${window.location.origin}/pricing?plan=${planCode}&checkout=cancelled`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error("Erreur lors du paiement. Réessayez.");
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <section className="px-5 py-16 md:py-20 relative">
      <div className="absolute inset-0 section-gradient" />
      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-secondary/8 text-secondary text-sm font-semibold mb-4">
            <HardHat className="h-3.5 w-3.5" /> Pour les entrepreneurs
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Choisissez votre plan selon vos objectifs</h2>
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
            Chaque plan comprend un abonnement, un accès à certaines classes de projets, des outils et des rendez-vous inclus.
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-muted rounded-xl p-1 gap-1">
            <button
              onClick={() => setInterval("month")}
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
                interval === "month"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Mensuel
            </button>
            <button
              onClick={() => setInterval("year")}
              className={cn(
                "px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
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

        {/* Plans */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[420px] rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {(plans ?? []).map((plan, i) => (
              <PlanCard
                key={plan.code}
                plan={plan}
                index={i}
                isRecommended={preSelectedPlan === plan.code}
                interval={interval}
                onCheckout={handleCheckout}
              />
            ))}
          </div>
        )}

        {/* Reminder block */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 rounded-2xl border border-border/50 bg-card/50 p-5 md:p-6 max-w-3xl mx-auto"
        >
          <p className="text-sm text-foreground font-semibold mb-2">
            Chaque plan inclut un certain nombre de rendez-vous exclusifs par mois.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Besoin de plus ? Achetez des rendez-vous supplémentaires à la carte, à l'unité ou en bloc, selon votre capacité et vos objectifs.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            <strong className="text-foreground">Places limitées</strong> selon la spécialité et la localité. Certaines zones ou catégories peuvent devenir complètes.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
