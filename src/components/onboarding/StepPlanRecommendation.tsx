import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  aippScore: number;
  objective: string;
  onSelectPlan: (planId: string, interval: "month" | "year") => void;
}

const plans = [
  {
    id: "starter", name: "Starter", positioning: "Get started with the basics",
    bestFor: "New contractors", monthlyPrice: 49, yearlyPrice: 499,
    actions: ["Profile completion", "Identity cleanup", "Review setup", "Logo normalization"],
    timeline: "2-4 weeks",
  },
  {
    id: "growth", name: "Growth", positioning: "Accelerate your local presence",
    bestFor: "Growing businesses", monthlyPrice: 99, yearlyPrice: 999,
    actions: ["Service + city pages", "Website conversion improvements", "Trust blocks", "FAQ and schema", "Stronger local visibility"],
    timeline: "1-3 months", recommended: true,
  },
  {
    id: "authority", name: "Authority", positioning: "Dominate your market",
    bestFor: "Established professionals", monthlyPrice: 199, yearlyPrice: 1999,
    actions: ["Multi-city content graph", "AISEO / AEO structure", "Entity building", "Media enhancement", "Competitive gap coverage"],
    timeline: "3-6 months",
  },
  {
    id: "signature", name: "Signature", positioning: "Category leadership",
    bestFor: "Top-tier businesses", monthlyPrice: 499, yearlyPrice: 4999,
    actions: ["Top-tier category dominance", "Advanced authority assets", "Premium optimization", "Strategic positioning", "Dedicated support"],
    timeline: "Ongoing",
  },
];

export default function StepPlanRecommendation({ aippScore, objective, onSelectPlan }: Props) {
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [selected, setSelected] = useState("growth");

  const recommended = aippScore >= 70 ? "authority" : aippScore >= 45 ? "growth" : "starter";

  return (
    <div className="dark min-h-screen px-4 py-12">
      <div className="w-full max-w-lg mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">Recommended Plan</h2>
          <p className="text-sm text-muted-foreground">Based on your AIPP score of <span className="text-primary font-semibold">{aippScore}</span> and your objectives.</p>
        </motion.div>

        {/* Interval toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-xl border border-border/50 bg-card/60 p-1">
            {(["month", "year"] as const).map(int => (
              <button key={int} onClick={() => setInterval(int)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${interval === int ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {int === "month" ? "Monthly" : "Annual"}{int === "year" && <span className="ml-1 text-success">Save 15%</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="space-y-3">
          {plans.map((plan, i) => {
            const isRec = plan.id === recommended;
            const isSel = plan.id === selected;
            const price = interval === "month" ? plan.monthlyPrice : Math.round(plan.yearlyPrice / 12);
            return (
              <motion.button
                key={plan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => setSelected(plan.id)}
                className={`w-full text-left rounded-xl border p-4 transition-all relative ${
                  isSel ? "border-primary bg-primary/5 shadow-[var(--shadow-glow)]" : "border-border/50 bg-card/60 hover:border-border"
                }`}
              >
                {isRec && (
                  <div className="absolute -top-2.5 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-primary to-accent text-white text-[10px] font-bold uppercase">
                    <Sparkles className="w-3 h-3" /> Recommended
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      {plan.id === "signature" && <Crown className="w-4 h-4 text-yellow-400" />}
                      <span className="text-base font-bold text-foreground">{plan.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{plan.positioning}</p>
                    <p className="text-[10px] text-muted-foreground/60">Best for {plan.bestFor} • {plan.timeline}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {plan.actions.slice(0, 3).map((a, j) => (
                        <span key={j} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-muted/30 text-muted-foreground">
                          <Check className="w-2.5 h-2.5 text-success" /> {a}
                        </span>
                      ))}
                      {plan.actions.length > 3 && <span className="text-[10px] text-muted-foreground/50">+{plan.actions.length - 3} more</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xl font-bold text-foreground">${price}</span>
                    <span className="text-xs text-muted-foreground">/mo</span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <Button onClick={() => onSelectPlan(selected, interval)} className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 border-0 rounded-xl gap-2">
          Continue to payment <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
