/**
 * AlexSuggestedNextStepCard — Shows THE single best next action.
 * Mobile-first, CTA always visible.
 */
import { motion } from "framer-motion";
import { Calendar, Search, UserCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EngineState } from "@/hooks/useAlexPersuasionEngine";

interface Props {
  state: EngineState;
  persuasionText?: string;
  topMatchName?: string;
  onAction: () => void;
  className?: string;
}

const STATE_CONFIG: Record<string, { icon: any; label: string; cta: string }> = {
  opening_calendar: { icon: Calendar, label: "Disponibilités trouvées", cta: "Voir les dispos" },
  matching: { icon: Search, label: "Recherche en cours…", cta: "Patienter" },
  waiting_input: { icon: ArrowRight, label: "Prochaine étape", cta: "Continuer" },
  objection_handling: { icon: UserCheck, label: "Je comprends", cta: "Voir les options" },
  no_result_recovery: { icon: Search, label: "Pas de match parfait", cta: "Élargir la recherche" },
  preparing_booking: { icon: Calendar, label: "Préparation…", cta: "Un instant" },
};

export default function AlexSuggestedNextStepCard({ state, persuasionText, topMatchName, onAction, className = "" }: Props) {
  const config = STATE_CONFIG[state] || STATE_CONFIG.waiting_input;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card border border-border rounded-2xl p-4 shadow-lg ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium">{config.label}</p>
          {persuasionText && (
            <p className="text-sm text-foreground mt-1 leading-snug">{persuasionText}</p>
          )}
          {topMatchName && (
            <p className="text-xs text-muted-foreground mt-1">
              👉 Recommandé : <span className="font-semibold text-foreground">{topMatchName}</span>
            </p>
          )}
        </div>
      </div>
      <Button
        onClick={onAction}
        className="w-full mt-3"
        size="sm"
        disabled={state === "matching" || state === "preparing_booking"}
      >
        {config.cta}
      </Button>
    </motion.div>
  );
}
