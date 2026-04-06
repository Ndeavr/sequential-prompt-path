import { motion } from "framer-motion";
import { Check, Lock, Sparkles } from "lucide-react";
import { getFeaturesForUnits, INCLUDED_FEATURES, type IncludedFeature, type FeatureTier } from "@/lib/condoDirectPricing";

interface Props {
  units: number;
}

const TIER_LABELS: Record<FeatureTier, string> = {
  base: "Inclus",
  "13+": "13+ unités",
  "30+": "30+ unités",
  "75+": "75+ unités",
  "150+": "150+ unités",
};

const TIER_ORDER: FeatureTier[] = ["base", "13+", "30+", "75+", "150+"];

export default function SectionCondosIncludedFeatures({ units }: Props) {
  const active = getFeaturesForUnits(units);
  const activeLabels = new Set(active.map((f) => f.label));

  const grouped = TIER_ORDER.map((tier) => ({
    tier,
    label: TIER_LABELS[tier],
    features: INCLUDED_FEATURES.filter((f) => f.tier === tier),
  }));

  return (
    <section className="space-y-5">
      <div className="text-center space-y-1">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Voici ce qui est inclus
        </h2>
        <p className="text-sm text-muted-foreground">
          Plus votre immeuble est grand, plus vous obtenez de valeur.
        </p>
      </div>

      <div className="space-y-4">
        {grouped.map(({ tier, label, features }) => {
          const allUnlocked = features.every((f) => activeLabels.has(f.label));
          const isBase = tier === "base";

          return (
            <motion.div
              key={tier}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-xl p-4 border border-border/40 space-y-2.5"
            >
              <div className="flex items-center gap-2">
                {allUnlocked ? (
                  <span className="w-5 h-5 rounded-full bg-success/15 flex items-center justify-center">
                    <Check className="w-3 h-3 text-success" />
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full bg-muted/40 flex items-center justify-center">
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  </span>
                )}
                <span className={`text-xs font-semibold ${allUnlocked ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
                {!isBase && allUnlocked && (
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-primary font-medium">
                    <Sparkles className="w-3 h-3" /> Débloqué
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {features.map((f) => {
                  const unlocked = activeLabels.has(f.label);
                  return (
                    <div
                      key={f.label}
                      className={`flex items-center gap-2 text-xs py-1 ${
                        unlocked ? "text-foreground" : "text-muted-foreground/50"
                      }`}
                    >
                      <Check className={`w-3 h-3 shrink-0 ${unlocked ? "text-success" : "text-muted-foreground/30"}`} />
                      {f.label}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
