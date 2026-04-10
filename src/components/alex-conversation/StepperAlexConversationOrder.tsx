import { motion } from "framer-motion";
import { Check, Circle } from "lucide-react";
import type { ConversationPhase } from "@/services/alexConversationOrderEngine";

const STEPS: { phase: ConversationPhase; label: string }[] = [
  { phase: "assess_problem", label: "Besoin" },
  { phase: "check_auth", label: "Compte" },
  { phase: "complete_profile", label: "Profil" },
  { phase: "request_address", label: "Adresse" },
  { phase: "run_match", label: "Match" },
  { phase: "show_result", label: "Résultat" },
];

const PHASE_ORDER: ConversationPhase[] = STEPS.map(s => s.phase);

interface Props {
  currentPhase: ConversationPhase;
  skippedPhases?: ConversationPhase[];
}

export default function StepperAlexConversationOrder({ currentPhase, skippedPhases = [] }: Props) {
  const currentIdx = PHASE_ORDER.indexOf(currentPhase);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-center gap-1 py-2 px-3"
    >
      {STEPS.map((step, i) => {
        const isSkipped = skippedPhases.includes(step.phase);
        const isDone = i < currentIdx || isSkipped;
        const isCurrent = step.phase === currentPhase;

        return (
          <div key={step.phase} className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] transition-colors ${
                  isDone
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                    ? "bg-primary/20 text-primary border border-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? <Check className="w-3 h-3" /> : <Circle className="w-2 h-2" />}
              </div>
              <span
                className={`text-[8px] mt-0.5 whitespace-nowrap ${
                  isCurrent ? "text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-4 h-px mt-[-8px] ${
                  i < currentIdx ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </motion.div>
  );
}
