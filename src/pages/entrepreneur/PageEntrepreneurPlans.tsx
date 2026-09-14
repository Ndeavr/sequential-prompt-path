/**
 * /entrepreneurs/plans — Public plan comparison for contractors.
 *
 * Prices come ONLY from the live catalog (`plans`, audience = contractor).
 * No hard-coded grid, no derived discount: the annual amount is the catalog
 * value, which is exactly 20 % off 12 months.
 */
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  PERSONALIZED_PLAN_HEADING,
  PERSONALIZED_PLAN_CTA,
  PERSONALIZED_PLAN_ROUTE,
} from "@/lib/billing/contractorPlanEligibility";
import {
  usePlanCatalog,
  formatPlanPrice,
  getYearlySavingsPercent,
  getMonthlyEquivalent,
  type BillingInterval,
} from "@/hooks/usePlanCatalog";
import { Skeleton } from "@/components/ui/skeleton";

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, Star, Sparkles, TrendingDown } from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

interface JoinDemo {
  business_name: string;
  city: string;
  score: number;
  recommended_plan: string;
  revenue_gap?: { lost_revenue_min: number };
}

export default function PageEntrepreneurPlans() {
  const navigate = useNavigate();
  const [joinDemo, setJoinDemo] = useState<JoinDemo | null>(null);
  const [interval, setInterval] = useState<BillingInterval>("month");
  const { data: plans, isLoading, isError } = usePlanCatalog();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("unpro_join_demo");
      if (raw) setJoinDemo(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);

  const yearlyAvailable = (plans ?? []).some((p) => p.supportsYearly);

  return (
    <>
      <Helmet>
        <title>Forfaits entrepreneurs — UNPRO</title>
        <meta
          name="description"
          content="Recrue gratuit, Départ, Croissance, Pro, Élite. Rendez-vous exclusifs garantis, jamais de leads partagés. Mensuel ou annuel avec 20 % de rabais."
        />
      </Helmet>

      <div className="min-h-screen bg-background py-12 sm:py-20">
        <div className="mx-auto max-w-7xl px-4">
          {joinDemo && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto max-w-3xl mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 flex items-start gap-3"
            >
              <TrendingDown className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-wider text-primary/80 mb-1">
                  Suite de votre analyse · {joinDemo.business_name}
                </div>
                <p className="text-sm text-foreground">
                  Score AIPP <span className="font-bold">{joinDemo.score}/100</span>
                  {joinDemo.revenue_gap && (
                    <> · Manque à gagner ~<span className="font-bold">{joinDemo.revenue_gap.lost_revenue_min.toLocaleString("fr-CA")} $/mois</span></>
                  )}
                  .
                </p>
              </div>
            </motion.div>
          )}

          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="text-center mb-10">
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Forfaits entrepreneurs
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Des rendez-vous exclusifs, jamais de leads partagés.
            </p>
            <p className="mt-6 text-base font-medium text-foreground">
              {PERSONALIZED_PLAN_HEADING}
            </p>
            <Button
              className="mt-4 gap-2 rounded-xl"
              onClick={() => navigate(PERSONALIZED_PLAN_ROUTE)}
            >
              <Sparkles className="h-4 w-4" />
              {PERSONALIZED_PLAN_CTA}
            </Button>
          </motion.div>

          {yearlyAvailable && (
            <div className="flex items-center justify-center gap-1 rounded-full bg-muted p-1 w-fit mx-auto mb-8">
              <button
                onClick={() => setInterval("month")}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  interval === "month" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Mensuel
              </button>
              <button
                onClick={() => setInterval("year")}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  interval === "year" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Payez 12 mois — économisez 20 %
              </button>
            </div>
          )}

          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-80 rounded-2xl" />
              ))}
            </div>
          )}

          {isError && (
            <p className="text-center text-sm text-muted-foreground">
              Les forfaits ne sont pas disponibles pour l'instant. Réessayez dans un moment.
            </p>
          )}

          {!isLoading && !isError && (
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory lg:grid lg:grid-cols-5 lg:overflow-visible">
              {(plans ?? []).map((plan, i) => {
                const showYearly = interval === "year" && plan.supportsYearly;
                const price = showYearly ? plan.yearlyPrice : plan.monthlyPrice;
                const savings = getYearlySavingsPercent(plan);
                return (
                  <motion.div
                    key={plan.code}
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                    className={`
                      snap-start shrink-0 w-72 lg:w-auto rounded-2xl border p-6 flex flex-col
                      ${plan.highlighted
                        ? "border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20"
                        : "border-border bg-card"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <h2 className="font-display text-xl font-bold text-foreground">{plan.name}</h2>
                      {plan.highlighted && (
                        <Badge variant="default" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Populaire
                        </Badge>
                      )}
                    </div>

                    <div className="mb-2">
                      <span className="font-display text-3xl font-bold text-foreground">
                        {plan.isFree ? "0 $" : formatPlanPrice(price)}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {" "}/ {plan.isFree ? "mois" : showYearly ? "an" : "mois"}
                      </span>
                    </div>
                    {showYearly && savings > 0 && (
                      <p className="text-xs text-muted-foreground mb-4">
                        Économisez {savings} % · équivalent à {getMonthlyEquivalent(plan)} / mois
                      </p>
                    )}
                    {!showYearly && <div className="mb-4" />}

                    <ul className="space-y-3 flex-1 mb-6">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span className="text-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      variant={plan.highlighted ? "default" : "outline"}
                      className="w-full gap-2 rounded-xl"
                      onClick={() =>
                        plan.isFree
                          ? navigate("/entrepreneur/onboarding")
                          : navigate(`${PERSONALIZED_PLAN_ROUTE}?plan=${plan.code}&interval=${showYearly ? "year" : "month"}`)
                      }
                    >
                      {plan.isFree ? "Activer gratuitement" : `Choisir ${plan.name}`}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="mt-16 max-w-3xl mx-auto text-center">
            <p className="text-muted-foreground">
              Tous les forfaits incluent le profil vérifié et la présence dans les réponses IA.
              <br />
              <span className="text-sm">
                Montants en CAD, taxes en sus selon votre adresse de facturation. Annulation en tout temps.
              </span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

