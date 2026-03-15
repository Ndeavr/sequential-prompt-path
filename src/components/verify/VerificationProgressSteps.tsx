/**
 * UNPRO — VerificationProgressSteps
 * Animated step-by-step progress during verification.
 */
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Circle } from "lucide-react";

export interface ProgressStep {
  label: string;
  status: "pending" | "active" | "done";
}

const STEP_LABELS = [
  "Vérification de la base interne UnPRO…",
  "Recherche des sources publiques…",
  "Analyse des correspondances…",
  "Vérification RBQ…",
  "Vérification NEQ…",
  "Analyse du site web…",
  "Analyse des avis…",
  "Analyse visuelle…",
  "Calcul du score…",
  "Envoi du dossier à l'équipe UnPRO…",
];

interface Props {
  activeStep: number; // 0-9, or 10 when complete
}

export default function VerificationProgressSteps({ activeStep }: Props) {
  const steps: ProgressStep[] = STEP_LABELS.map((label, i) => ({
    label,
    status: i < activeStep ? "done" : i === activeStep ? "active" : "pending",
  }));

  return (
    <div className="space-y-1">
      <AnimatePresence mode="popLayout">
        {steps.map((step, i) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{
              opacity: step.status === "pending" ? 0.4 : 1,
              y: 0,
            }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="flex items-center gap-3 py-2 px-3 rounded-lg"
          >
            {step.status === "done" ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              </motion.div>
            ) : step.status === "active" ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground/30 shrink-0" />
            )}
            <span className={`text-sm ${
              step.status === "done"
                ? "text-foreground font-medium"
                : step.status === "active"
                  ? "text-primary font-medium"
                  : "text-muted-foreground/50"
            }`}>
              {step.label}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
