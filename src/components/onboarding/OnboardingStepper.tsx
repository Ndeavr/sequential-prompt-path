/**
 * UNPRO — Onboarding Stepper (visual progress)
 */
import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface OnboardingStepperProps {
  steps: string[];
  currentStep: number;
}

export default function OnboardingStepper({ steps, currentStep }: OnboardingStepperProps) {
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="flex items-center gap-1">
        {steps.map((label, i) => {
          const isActive = i === currentStep;
          const isDone = i < currentStep;
          return (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                  isDone
                    ? "bg-primary"
                    : isActive
                    ? "bg-primary/60"
                    : "bg-muted"
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive
                    ? "text-primary"
                    : isDone
                    ? "text-primary/60"
                    : "text-muted-foreground/50"
                }`}
              >
                {isDone ? <Check className="h-3 w-3 inline" /> : null} {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
