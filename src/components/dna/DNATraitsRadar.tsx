/**
 * UNPRO — DNA Traits Radar / Visual Grid
 * Displays DNA traits as a styled bar grid (mobile-friendly alternative to radar chart).
 */

import { motion } from "framer-motion";

interface DNATraitsRadarProps {
  traits: Record<string, number>;
  compareTraits?: Record<string, number>;
  variant?: "homeowner" | "contractor" | "comparison";
}

const TRAIT_LABELS_FR: Record<string, string> = {
  involvement: "Implication",
  budgetSensitivity: "Sensibilité budget",
  speedPriority: "Priorité rapidité",
  qualityPriority: "Priorité qualité",
  communicationDetail: "Détail communication",
  autonomyPreference: "Autonomie",
  cleanlinessExpectation: "Propreté",
  documentationPreference: "Documentation",
  noiseTolerance: "Tolérance bruit",
  friendlinessPreference: "Style relationnel",
};

export default function DNATraitsRadar({ traits, compareTraits, variant = "homeowner" }: DNATraitsRadarProps) {
  const entries = Object.entries(traits).filter(([key]) => TRAIT_LABELS_FR[key]);

  const primaryColor = variant === "contractor" ? "bg-secondary" : "bg-primary";
  const compareColor = "bg-accent/60";

  return (
    <div className="space-y-2.5">
      {entries.map(([key, value], i) => {
        const compareValue = compareTraits?.[key];
        const label = TRAIT_LABELS_FR[key] || key;

        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{label}</span>
              <span className="text-[10px] text-muted-foreground font-semibold">
                {Math.round(value)}
                {compareValue !== undefined && (
                  <span className="text-accent ml-1">vs {Math.round(compareValue)}</span>
                )}
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                className={`absolute inset-y-0 left-0 rounded-full ${primaryColor}`}
              />
              {compareValue !== undefined && (
                <motion.div
                  initial={{ left: 0 }}
                  animate={{ left: `${compareValue}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05 + 0.3, ease: "easeOut" }}
                  className="absolute top-0 h-2 w-0.5 bg-accent"
                  style={{ transform: "translateX(-50%)" }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
