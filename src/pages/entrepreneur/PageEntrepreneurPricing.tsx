import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Sparkles, ArrowRight, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONTRACTOR_PLANS, formatPlanPrice, getYearlySavingsPercent, type BillingInterval } from "@/config/contractorPlans";
import { cn } from "@/lib/utils";

const PageEntrepreneurPricing = () => {
  const navigate = useNavigate();
  const [interval, setInterval] = useState<BillingInterval>("year");

  const handleSelectPlan = (planId: string) => {
    sessionStorage.setItem("unpro_selected_plan", planId);
    sessionStorage.setItem("unpro_selected_interval", interval);
    navigate("/checkout");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            <Crown className="w-4 h-4" />
            Plans entrepreneur
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3 font-display">
            Choisissez votre niveau de visibilité
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Plus votre plan est élevé, plus vous recevez de rendez-vous qualifiés.
          </p>
        </motion.div>

        {/* Interval Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-muted rounded-xl p-1 gap-1">
            <button
              onClick={() => setInterval("month")}
              className={cn(
                "px-5 py-2 rounded-lg text-sm font-medium transition-all",
                interval === "month" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              Mensuel
            </button>
            <button
              onClick={() => setInterval("year")}
              className={cn(
                "px-5 py-2 rounded-lg text-sm font-medium transition-all",
                interval === "year" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              Annuel
              <span className="ml-1 text-xs text-success font-bold">-15%</span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CONTRACTOR_PLANS.filter(p => p.id !== "recrue").map((plan, i) => {
            const price = interval === "year" ? plan.yearlyPrice / 12 : plan.monthlyPrice;
            const savings = getYearlySavingsPercent(plan);

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={cn(
                  "bg-card rounded-2xl p-6 border transition-all relative",
                  plan.highlighted
                    ? "border-primary shadow-lg ring-2 ring-primary/20"
                    : "border-border shadow-sm hover:shadow-md"
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                    Populaire
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-extrabold text-foreground">{formatPlanPrice(price)}</span>
                    <span className="text-muted-foreground text-sm">/mois</span>
                  </div>
                  {interval === "year" && savings > 0 && (
                    <p className="text-xs text-success font-semibold mt-1">Économisez {savings}%</p>
                  )}
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={cn(
                    "w-full font-bold gap-2",
                    plan.highlighted ? "" : "variant-outline"
                  )}
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  Commencer
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Free tier */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <p className="text-muted-foreground text-sm mb-2">Pas prêt ? Commencez gratuitement.</p>
          <Button variant="ghost" onClick={() => handleSelectPlan("recrue")} className="gap-2 text-sm">
            <Sparkles className="w-4 h-4" />
            Essayer le plan Recrue (gratuit)
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default PageEntrepreneurPricing;
