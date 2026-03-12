/**
 * Shell wrapper for the onboarding flow — forces dark mode, cinematic ambient, step navigation.
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
      {/* Multi-layer ambient glow background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-[-30%] left-[-15%] w-[70vw] h-[70vw] rounded-full bg-primary/[0.04] blur-[150px]"
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-25%] right-[-15%] w-[55vw] h-[55vw] rounded-full bg-secondary/[0.04] blur-[130px]"
          animate={{ x: [0, -20, 0], y: [0, 25, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] rounded-full bg-accent/[0.02] blur-[100px]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="h-[2px] bg-border/30">
            <motion.div
              className="h-full bg-gradient-to-r from-primary via-accent to-secondary rounded-r-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          {/* Step indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-3 right-4 text-[10px] text-muted-foreground/60 font-medium tracking-wider"
          >
            {currentStep + 1} / {totalSteps}
          </motion.div>
        </div>
      )}

      {/* Content with premium transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -16, filter: "blur(4px)" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
