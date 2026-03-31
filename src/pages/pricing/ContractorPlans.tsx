/**
 * UNPRO — Contractor Plans with billing toggle & pre-selection support
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, ArrowRight, HardHat, Users, TrendingUp,
  Star, Crown,
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { CONTRACTOR_PLANS, formatPlanPrice, getYearlySavingsPercent, type BillingInterval, type ContractorPlan } from "@/config/contractorPlans";
import { cn } from "@/lib/utils";

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
};

function PlanCard({ plan, index, isRecommended, interval, onCheckout }: {
  plan: ContractorPlan;
  index: number;
  isRecommended: boolean;
  interval: BillingInterval;
  onCheckout: (planId: string) => void;
}) {
  const isHighlighted = isRecommended || plan.highlighted;
  const Icon = PLAN_ICONS[plan.id] || Users;

  const monthlyPrice = interval === "year" ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
  const savings = getYearlySavingsPercent(plan);

  return (
    <motion.div variants={fadeUp} custom={index} initial="hidden" whileInView="visible" viewport={{ once: true }} data-plan={plan.id}>
      <div className={cn(
        "rounded-2xl p-6 h-full flex flex-col transition-all duration-300 hover:-translate-y-1 relative",
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
          <span className="text-4xl font-extrabold text-foreground">{formatPlanPrice(monthlyPrice)}</span>
          <span className="text-muted-foreground text-sm">/mois</span>
        </div>

        {interval === "year" && savings > 0 && (
          <p className="text-xs font-semibold text-success mb-3">
            Économisez {savings}% vs mensuel
          </p>
        )}
        {interval === "month" && savings > 0 && plan.monthlyPrice > 0 && (
          <p className="text-xs text-muted-foreground mb-3">
            ou {formatPlanPrice(Math.round(plan.yearlyPrice / 12))}/mois en annuel{" "}
            <span className="text-success font-semibold">(-{savings}%)</span>
          </p>
        )}
        {plan.monthlyPrice === 0 && <div className="mb-3" />}

        <ul className="space-y-2.5 mb-5 flex-1">
          {plan.features.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              <span className="text-sm text-muted-foreground">{f}</span>
            </li>
          ))}
        </ul>

        {/* Contextual links */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-4">
          <Link to="/score-aipp" className="text-[10px] text-muted-foreground hover:text-primary underline decoration-dotted underline-offset-2 transition-colors">Score AIPP</Link>
          <Link to="/comment-ca-marche" className="text-[10px] text-muted-foreground hover:text-primary underline decoration-dotted underline-offset-2 transition-colors">Comment ça marche</Link>
        </div>

        {plan.monthlyPrice > 0 ? (
          <Button
            size="lg"
            variant={isHighlighted ? "default" : "outline"}
            className={cn("w-full rounded-xl", isHighlighted && "shadow-glow")}
            onClick={() => onCheckout(plan.id)}
          >
            {plan.id === "elite" ? "Choisir Élite" : `Choisir ${plan.name}`}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            asChild
            size="lg"
            variant="outline"
            className="w-full rounded-xl"
          >
            <Link to="/signup?type=contractor">Créer mon profil</Link>
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export default function ContractorPlans({ preSelectedPlan }: { preSelectedPlan?: string | null }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [interval, setInterval] = useState<BillingInterval>("month");

  const handleCheckout = async (planId: string) => {
    setLoading(planId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = `/signup?type=contractor&plan=${planId}`;
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          planId,
          billingInterval: interval,
          successUrl: `${window.location.origin}/pro/onboarding?plan=${planId}&checkout=success`,
          cancelUrl: `${window.location.origin}/pricing?plan=${planId}&checkout=cancelled`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error("Erreur lors du paiement. Réessayez.");
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const visiblePlans = CONTRACTOR_PLANS.filter(p => p.id !== "signature");

  return (
    <section className="px-5 py-16 md:py-20 relative">
      <div className="absolute inset-0 section-gradient" />
      <div className="relative z-10 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-secondary/8 text-secondary text-sm font-semibold mb-4">
            <HardHat className="h-3.5 w-3.5" /> Pour les entrepreneurs
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Choisissez votre plan</h2>
          <p className="text-muted-foreground mt-2">Recevez des rendez-vous garantis exclusifs. Pas des leads partagés.</p>
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

        {interval === "year" && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-sm text-success font-medium mb-6"
          >
            🎉 Économisez jusqu'à 15% avec le paiement annuel
          </motion.p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {visiblePlans.map((plan, i) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              index={i}
              isRecommended={preSelectedPlan === plan.id}
              interval={interval}
              onCheckout={handleCheckout}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
