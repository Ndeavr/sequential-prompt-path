/**
 * Shell wrapper for the onboarding flow — forces dark mode, provides step navigation.
 */
import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface OnboardingShellProps {
  currentStep: number;
  totalSteps: number;
  children: ReactNode;
  showProgress?: boolean;
}

export default function OnboardingShell({ currentStep, totalSteps, children, showProgress = true }: OnboardingShellProps) {
  return (
    <div className="dark min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Ambient glow background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-secondary/5 blur-[120px]" />
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted/30">
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-accent to-secondary"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative z-10"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
