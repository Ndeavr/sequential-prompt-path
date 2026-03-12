import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, ChevronRight, Sparkles, Shield, TrendingUp, Zap, Star, Award } from "lucide-react";
import { PremiumMagneticButton } from "@/components/ui/PremiumMagneticButton";

interface Props {
  aippScore: number;
  objective: string;
  onSelectPlan: (planId: string, interval: "month" | "year") => void;
}

const plans = [
  {
    id: "recrue", name: "Recrue", icon: Zap, badge: "Point de départ",
    positioning: "Build a credible business profile fast.",
    bestFor: "New contractors, small suppliers, weak online presence",
    monthlyPrice: 49, yearlyPrice: 499,
    actions: ["Profile completion essentials", "Business identity cleanup", "Logo & contact normalization", "Service & area setup", "Trust basics", "Starter visibility foundation"],
    timeline: "Results in 2–4 weeks",
    upgradePath: "Pro",
  },
  {
    id: "pro", name: "Pro", icon: TrendingUp, badge: "Solid foundation",
    positioning: "Strengthen credibility and improve lead readiness.",
    bestFor: "Existing businesses needing stronger trust & conversions",
    monthlyPrice: 99, yearlyPrice: 999,
    actions: ["Everything in Recrue", "Stronger trust layer", "Improved profile clarity", "Improved lead-readiness", "Better customer-facing positioning", "Stronger review & contact presentation"],
    timeline: "Results in 1–3 months",
    upgradePath: "Premium",
  },
  {
    id: "premium", name: "Premium", icon: Star, badge: "Growth mode",
    positioning: "Turn your profile into a stronger visibility and conversion engine.",
    bestFor: "Contractors wanting more calls, better local visibility",
    monthlyPrice: 149, yearlyPrice: 1499,
    actions: ["Everything in Pro", "Stronger conversion blocks", "City/service visibility improvements", "FAQ foundations", "Better trust presentation", "Stronger local growth structure"],
    timeline: "Results in 1–3 months",
    upgradePath: "Élite",
  },
  {
    id: "elite", name: "Élite", icon: Award, badge: "Authority builder",
    positioning: "Build stronger authority, broader reach, and deeper local market presence.",
    bestFor: "Established pros targeting local dominance",
    monthlyPrice: 249, yearlyPrice: 2499,
    actions: ["Everything in Premium", "Stronger city/service structure", "Deeper authority signals", "AI / SEO readiness improvements", "Proof & media enrichment", "Competitive opportunity targeting"],
    timeline: "Results in 3–6 months",
    upgradePath: "Signature",
  },
  {
    id: "signature", name: "Signature", icon: Crown, badge: "Premium dominance",
    positioning: "Maximum authority, visibility, and premium market positioning.",
    bestFor: "Top-tier businesses seeking category leadership",
    monthlyPrice: 499, yearlyPrice: 4999,
    actions: ["Everything in Élite", "Premium authority positioning", "Strongest trust & verification layer", "Advanced strategic visibility guidance", "Premium dashboard intelligence", "Highest-level growth prioritization"],
    timeline: "Ongoing premium support",
    upgradePath: null,
  },
];

function getRecommendedPlan(aippScore: number, objective: string): string {
  // Signature for premium dominance objectives
  if (["ai_search_authority", "premium_profile_completion"].includes(objective) && aippScore >= 75) return "signature";
  // Élite for domination objectives
  if (["dominate_one_city", "expand_multi_city", "better_google_visibility"].includes(objective) && aippScore >= 60) return "elite";
  // Premium for growth objectives
  if (["more_calls", "better_conversion", "more_reviews"].includes(objective) && aippScore >= 40) return "premium";
  // Pro for mid-range
  if (aippScore >= 25 && aippScore < 55) return "pro";
  // Default to recrue for low scores
  if (aippScore < 30) return "recrue";
  // Fallback based on score bands
  if (aippScore >= 75) return "signature";
  if (aippScore >= 60) return "elite";
  if (aippScore >= 40) return "premium";
  if (aippScore >= 25) return "pro";
  return "recrue";
}

function getRecommendationReason(planId: string, aippScore: number, objective: string): string {
  const reasons: Record<string, string> = {
    recrue: `Your score of ${aippScore} shows your profile needs foundational work — identity, trust basics, and service setup. Recrue fixes these gaps first, giving you a clean launchpad for growth. Next step: Pro.`,
    pro: `Your score of ${aippScore} shows you have a base but trust and positioning need strengthening. Pro improves your conversion-readiness and review presentation. Next step: Premium.`,
    premium: `Your score of ${aippScore} shows solid foundations. Premium unlocks stronger visibility, conversion blocks, and local growth structure. Next step: Élite.`,
    elite: `Your score of ${aippScore} shows market-ready maturity. Élite builds deeper authority signals, AI/SEO readiness, and competitive positioning. Next step: Signature.`,
    signature: `Your score of ${aippScore} positions you for category leadership. Signature delivers maximum authority, premium optimization, and the strongest growth prioritization.`,
  };
  return reasons[planId] || reasons.recrue;
}

const objectiveLabel: Record<string, string> = {
  more_calls: "more calls",
  better_google_visibility: "Google visibility",
  more_reviews: "more reviews",
  better_conversion: "better conversions",
  dominate_one_city: "local dominance",
  expand_multi_city: "multi-city expansion",
  ai_search_authority: "AI-search authority",
  premium_profile_completion: "profile completion",
};

export default function StepPlanRecommendation({ aippScore, objective, onSelectPlan }: Props) {
  const [interval, setInterval] = useState<"month" | "year">("month");
  const recommended = getRecommendedPlan(aippScore, objective);
  const [selected, setSelected] = useState(recommended);

  return (
    <div className="dark min-h-screen px-4 py-10">
      <div className="w-full max-w-lg mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
            Your Recommended Plan
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Based on your AIPP score of <span className="text-primary font-bold">{aippScore}</span> and your goal of{" "}
            <span className="text-foreground font-medium">{objectiveLabel[objective] || objective}</span>.
          </p>
        </motion.div>

        {/* Recommendation reason */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3.5 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-semibold">Why {plans.find(p => p.id === recommended)?.name}?</span>{" "}
            {getRecommendationReason(recommended, aippScore, objective)}
          </p>
        </motion.div>

        {/* Interval toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-1">
            {(["month", "year"] as const).map(int => (
              <button key={int} onClick={() => setInterval(int)}
                className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  interval === int
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                {int === "month" ? "Mensuel" : "Annuel"}
                {int === "year" && <span className="ml-1.5 text-success font-bold">-15%</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="space-y-2.5">
          {plans.map((plan, i) => {
            const isRec = plan.id === recommended;
            const isSel = plan.id === selected;
            const price = interval === "month" ? plan.monthlyPrice : Math.round(plan.yearlyPrice / 12);
            const PlanIcon = plan.icon;
            return (
              <motion.button
                key={plan.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.07 }}
                onClick={() => setSelected(plan.id)}
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
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                    isSel ? "bg-primary/15" : "bg-muted/20"
                  }`}>
                    <PlanIcon className={`w-5 h-5 ${isSel ? "text-primary" : "text-muted-foreground/50"}`} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-foreground">{plan.name}</span>
                      <span className="text-[10px] text-muted-foreground/50 font-medium">{plan.badge}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/70">{plan.positioning}</p>
                    <p className="text-[10px] text-muted-foreground/40">{plan.bestFor} • {plan.timeline}</p>
                    {isSel && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        className="pt-2 space-y-1">
                        {plan.actions.map((a, j) => (
                          <div key={j} className="flex items-center gap-2 text-[11px]">
                            <Check className="w-3 h-3 text-success flex-shrink-0" />
                            <span className="text-muted-foreground">{a}</span>
                          </div>
                        ))}
                        {plan.upgradePath && (
                          <p className="text-[10px] text-primary/60 mt-2 font-medium">
                            Prochaine étape → {plan.upgradePath}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xl font-bold text-foreground">${price}</span>
                    <span className="text-[10px] text-muted-foreground/50">/mo</span>
                    {interval === "year" && (
                      <p className="text-[10px] text-success font-medium mt-0.5">
                        ${plan.monthlyPrice - price}/mo saved
                      </p>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <PremiumMagneticButton
          onReleaseAction={() => onSelectPlan(selected, interval)}
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
