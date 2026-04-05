/**
 * UNPRO — FunnelProgressBar
 * Premium progress indicator for the contractor onboarding funnel.
 */
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { FUNNEL_STEPS, type FunnelStep } from "@/types/contractorFunnel";

interface Props {
  currentStep: FunnelStep;
  className?: string;
}

const STEP_LABELS: Record<FunnelStep, string> = {
  landing: "Accueil",
  onboarding_start: "Démarrage",
  import_workspace: "Import",
  aipp_builder: "Profil AIPP",
  assets_studio: "Assets",
  faq_builder: "FAQ",
  plan_recommendation: "Plan",
  checkout: "Paiement",
  activation: "Activation",
};

export default function FunnelProgressBar({ currentStep, className }: Props) {
  const currentIdx = FUNNEL_STEPS.indexOf(currentStep);
  const progress = ((currentIdx) / (FUNNEL_STEPS.length - 1)) * 100;

  return (
    <div className={cn("w-full", className)}>
      {/* Progress bar */}
      <div className="relative h-1 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-secondary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {/* Step label */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted-foreground">
          Étape {currentIdx + 1}/{FUNNEL_STEPS.length}
        </span>
        <span className="text-xs font-medium text-foreground">
          {STEP_LABELS[currentStep]}
        </span>
      </div>
    </div>
  );
}
