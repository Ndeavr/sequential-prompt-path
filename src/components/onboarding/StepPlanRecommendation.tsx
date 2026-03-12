import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, ChevronRight, Sparkles, Shield, TrendingUp, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PremiumMagneticButton } from "@/components/ui/PremiumMagneticButton";

interface Props {
  aippScore: number;
  objective: string;
  onSelectPlan: (planId: string, interval: "month" | "year") => void;
}

const plans = [
  {
    id: "starter", name: "Starter", icon: Zap, positioning: "Get started with the essentials",
    bestFor: "New contractors building their first online presence",
    monthlyPrice: 49, yearlyPrice: 499,
    actions: ["Profile completion & cleanup", "Identity normalization", "Review setup & templates", "Logo & media normalization", "Basic local signals"],
    timeline: "Results in 2-4 weeks",
    highlight: "Perfect to start",
  },
  {
    id: "growth", name: "Growth", icon: TrendingUp, positioning: "Accelerate your local dominance",
    bestFor: "Growing businesses ready to scale leads",
    monthlyPrice: 99, yearlyPrice: 999,
    actions: ["Everything in Starter", "Service + city landing pages", "Website conversion audit", "Trust blocks & social proof", "FAQ & schema markup", "Stronger local visibility"],
    timeline: "Results in 1-3 months",
    highlight: "Most popular",
  },
  {
    id: "authority", name: "Authority", icon: Star, positioning: "Dominate your entire market",
    bestFor: "Established pros targeting category leadership",
    monthlyPrice: 199, yearlyPrice: 1999,
    actions: ["Everything in Growth", "Multi-city content graph", "AI SEO / AEO structure", "Entity & knowledge graph", "Media enhancement pipeline", "Competitive gap coverage"],
    timeline: "Results in 3-6 months",
    highlight: "Fastest growth",
  },
  {
    id: "signature", name: "Signature", icon: Crown, positioning: "Unmatched category leadership",
    bestFor: "Top-tier businesses seeking permanent dominance",
    monthlyPrice: 499, yearlyPrice: 4999,
    actions: ["Everything in Authority", "Top-tier category dominance", "Advanced authority assets", "Premium optimization suite", "Strategic market positioning", "Dedicated success manager"],
    timeline: "Ongoing premium support",
    highlight: "Best ROI",
  },
];

export default function StepPlanRecommendation({ aippScore, objective, onSelectPlan }: Props) {
  const [interval, setInterval] = useState<"month" | "year">("month");
  const recommended = aippScore >= 70 ? "authority" : aippScore >= 45 ? "growth" : "starter";
  const [selected, setSelected] = useState(recommended);

  const objectiveLabel: Record<string, string> = {
    calls: "more calls", maps: "Google Maps visibility", reviews: "more reviews",
    conversions: "better conversions", dominate: "local dominance", expand: "multi-city expansion",
    "ai-authority": "AI-search authority", complete: "fast profile completion",
  };

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
            Your score shows strong foundations but gaps in{" "}
            {aippScore < 50 ? "trust, visibility, and conversion" : "visibility and AI readiness"}. This plan
            targets your weakest pillars while building toward {objectiveLabel[objective] || "your goals"}.
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
                {int === "month" ? "Monthly" : "Annual"}
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
                    <Sparkles className="w-3 h-3" /> Recommended
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
                      <span className="text-[10px] text-muted-foreground/50 font-medium">{plan.highlight}</span>
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
          Continue to secure checkout
        </PremiumMagneticButton>
      </div>
    </div>
  );
}
