/**
 * CardPredictionProblem — Shows detected problem + confidence.
 */
import { motion } from "framer-motion";
import { AlertTriangle, Snowflake, Droplets, Wrench, Home, Zap } from "lucide-react";
import type { DetectedIntent } from "@/hooks/useIntentFunnel";

const INTENT_ICONS: Record<string, React.ElementType> = {
  isolation: Snowflake,
  infiltration_eau: Droplets,
  toiture: Home,
  urgence_plomberie: AlertTriangle,
  rénovation_cuisine: Wrench,
  chauffage: Zap,
};

const INTENT_LABELS: Record<string, string> = {
  isolation: "Problème d'isolation",
  infiltration_eau: "Infiltration d'eau",
  toiture: "Problème de toiture",
  urgence_plomberie: "Urgence plomberie",
  rénovation_cuisine: "Rénovation cuisine",
  réparation_générale: "Réparation générale",
  chauffage: "Problème de chauffage",
};

interface Props {
  intent: DetectedIntent;
}

export default function CardPredictionProblem({ intent }: Props) {
  const Icon = INTENT_ICONS[intent.primary] ?? Wrench;
  const label = INTENT_LABELS[intent.primary] ?? intent.primary;
  const urgencyColors = {
    low: "text-green-400 bg-green-500/10",
    medium: "text-yellow-400 bg-yellow-500/10",
    high: "text-orange-400 bg-orange-500/10",
    critical: "text-red-400 bg-red-500/10",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-foreground">{label}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${urgencyColors[intent.urgency]}`}>
              {intent.urgency === "critical" ? "Urgent" : intent.urgency === "high" ? "Prioritaire" : "Normal"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${intent.confidence * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">
              {Math.round(intent.confidence * 100)}% confiance
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
