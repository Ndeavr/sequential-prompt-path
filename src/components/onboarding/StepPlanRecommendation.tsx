// Canonical plan recommendation step.
// PRICES AND PLANS ARE NEVER HARDCODED HERE — the catalog comes from
// public.plans (active, non-legacy) and the recommended code comes from the
// server (activation-goals / compute-pricing-quote) whenever available.
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, ChevronRight, Sparkles, Shield, TrendingUp, Zap, Star, Award, Loader2 } from "lucide-react";
import { PremiumMagneticButton } from "@/components/ui/PremiumMagneticButton";
import { supabase } from "@/integrations/supabase/client";

interface PlanRow {
  code: string;
  name: string;
  monthly_price: number;
  appointments_included: number | null;
  description: string | null;
  tier_rank: number;
  features: unknown;
}

interface Props {
  aippScore: number;
  objective: string;
  /** Server-recommended plan code (canonical engine). Optional. */
  recommendedPlanCode?: string | null;
  /** Server-computed personalized monthly price in cents. Optional. */
  personalizedPriceCents?: number | null;
  /** Server explanation of the recommendation. Optional. */
  recommendationReason?: string | null;
  onSelectPlan: (planId: string, interval: "month" | "year", monthlyPriceCents: number) => void;
}

const ICONS = [Zap, TrendingUp, Star, Award, Crown, Crown];

const objectiveLabel: Record<string, string> = {
  more_calls: "plus d'appels",
  better_google_visibility: "visibilité Google",
  more_reviews: "plus d'avis",
  better_conversion: "meilleure conversion",
  dominate_one_city: "domination locale",
  expand_multi_city: "expansion multi-villes",
  ai_search_authority: "autorité en recherche IA",
  premium_profile_completion: "profil complet",
};

const fmt = (cents: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })
    .format(cents / 100);

export default function StepPlanRecommendation({
  aippScore,
  objective,
  recommendedPlanCode,
  personalizedPriceCents,
  recommendationReason,
  onSelectPlan,
}: Props) {
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(recommendedPlanCode ?? null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("plans")
        .select("code,name,monthly_price,appointments_included,description,tier_rank,features")
        .eq("active", true)
        .eq("legacy", false)
        .not("code", "like", "home_%")
        .order("tier_rank", { ascending: true });
      if (!alive) return;
      const rows = (data ?? []) as unknown as PlanRow[];
      setPlans(rows);
      setLoading(false);
      setSelected((cur) => cur ?? recommendedPlanCode ?? rows[0]?.code ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [recommendedPlanCode]);

  const recommended = recommendedPlanCode ?? null;
  const recommendedPlan = useMemo(
    () => plans.find((p) => p.code === recommended) ?? null,
    [plans, recommended],
  );

  if (loading) {
    return (
      <div className="dark min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="dark min-h-screen px-4 py-10">
      <div className="w-full max-w-lg mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
            Votre plan recommandé
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {aippScore > 0 ? (
              <>
                Score de visibilité <span className="text-primary font-bold">{aippScore}</span>
                {objective ? (
                  <>
                    {" "}• objectif :{" "}
                    <span className="text-foreground font-medium">
                      {objectiveLabel[objective] || objective}
                    </span>
                  </>
                ) : null}
              </>
            ) : (
              "Choisissez le rythme de rendez-vous qui correspond à votre capacité."
            )}
          </p>
        </motion.div>

        {recommendedPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3.5 flex items-start gap-3"
          >
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-foreground font-semibold">Pourquoi {recommendedPlan.name} ?</span>{" "}
              {recommendationReason ||
                `${recommendedPlan.appointments_included ?? 0} rendez-vous garantis par mois, ajustés à votre territoire et à votre capacité.`}
              {typeof personalizedPriceCents === "number" && (
                <>
                  {" "}Prix personnalisé :{" "}
                  <span className="text-foreground font-semibold">{fmt(personalizedPriceCents)}/mois</span>.
                </>
              )}
            </p>
          </motion.div>
        )}

        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-1">
            {(["month", "year"] as const).map((int) => (
              <button
                key={int}
                onClick={() => setInterval(int)}
                className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  interval === int
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {int === "month" ? "Mensuel" : "Annuel"}
                {int === "year" && <span className="ml-1.5 text-success font-bold">-15%</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {plans.map((plan, i) => {
            const isRec = plan.code === recommended;
            const isSel = plan.code === selected;
            const monthly =
              isRec && typeof personalizedPriceCents === "number"
                ? personalizedPriceCents
                : plan.monthly_price;
            const price = interval === "month" ? monthly : Math.round(monthly * 0.85);
            const PlanIcon = ICONS[Math.min(i, ICONS.length - 1)];
            const features = Array.isArray(plan.features) ? (plan.features as string[]) : [];
            return (
              <motion.button
                key={plan.code}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.07 }}
                onClick={() => setSelected(plan.code)}
                whileTap={{ scale: 0.985 }}
                className={`w-full text-left rounded-xl border p-4 transition-all duration-300 relative group ${
                  isSel
                    ? "border-primary/40 bg-primary/[0.06] shadow-[var(--shadow-glow)]"
                    : "border-border/30 bg-card/30 hover:border-border/50 hover:bg-card/40"
                }`}
              >
                {isRec && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.07, type: "spring" }}
                    className="absolute -top-2.5 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-white text-[10px] font-bold uppercase tracking-wider shadow-md"
                  >
                    <Sparkles className="w-3 h-3" /> Recommandé
                  </motion.div>
                )}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                      isSel ? "bg-primary/15" : "bg-muted/20"
                    }`}
                  >
                    <PlanIcon className={`w-5 h-5 ${isSel ? "text-primary" : "text-muted-foreground/50"}`} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-foreground">{plan.name}</span>
                      {(plan.appointments_included ?? 0) > 0 && (
                        <span className="text-[10px] text-muted-foreground/60 font-medium">
                          {plan.appointments_included} rendez-vous/mois
                        </span>
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-[11px] text-muted-foreground/70">{plan.description}</p>
                    )}
                    {isSel && features.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="pt-2 space-y-1"
                      >
                        {features.slice(0, 6).map((a, j) => (
                          <div key={j} className="flex items-center gap-2 text-[11px]">
                            <Check className="w-3 h-3 text-success flex-shrink-0" />
                            <span className="text-muted-foreground">{String(a)}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xl font-bold text-foreground">{fmt(price)}</span>
                    <span className="text-[10px] text-muted-foreground/50">/mois</span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <PremiumMagneticButton
          onReleaseAction={() => {
            const plan = plans.find((p) => p.code === selected);
            if (!plan) return;
            const monthly =
              plan.code === recommended && typeof personalizedPriceCents === "number"
                ? personalizedPriceCents
                : plan.monthly_price;
            onSelectPlan(plan.code, interval, monthly);
          }}
          variant="indigo"
          fullWidth
          iconRight={<ChevronRight className="w-4 h-4" />}
          className="h-13 text-base font-semibold"
        >
          <Shield className="w-4 h-4" />
          Continuer vers le paiement sécurisé
        </PremiumMagneticButton>
      </div>
    </div>
  );
}
