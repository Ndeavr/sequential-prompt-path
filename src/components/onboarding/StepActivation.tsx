import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";

interface Props {
  onComplete: () => void;
}

const steps = [
  { label: "Securing your category footprint", microcopy: "Matching your public business footprint…" },
  { label: "Syncing your business signals", microcopy: "Standardizing service and category signals…" },
  { label: "Building your verified identity graph", microcopy: "Cross-referencing trust markers…" },
  { label: "Enriching with trust signals", microcopy: "Strengthening trust and conversion layers…" },
  { label: "Generating ranking opportunities", microcopy: "Generating your optimized profile structure…" },
  { label: "Activating your UNPRO presence", microcopy: "Your business profile is now activating…" },
];

export default function StepActivation({ onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [profilePct, setProfilePct] = useState(12);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          setTimeout(onComplete, 1500);
          return prev;
        }
        return prev + 1;
      });
      setProfilePct(prev => Math.min(100, prev + Math.round(88 / steps.length)));
    }, 1800);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="dark min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-10">
        {/* Central orb */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-32 h-32">
            {/* Glow rings */}
            <motion.div className="absolute inset-[-20px] rounded-full border border-primary/10"
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }} />
            <motion.div className="absolute inset-[-10px] rounded-full border border-accent/15"
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.1, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }} />
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 via-accent/20 to-secondary/30 blur-2xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <div className="absolute inset-2 rounded-full bg-card border border-border/50 flex items-center justify-center">
              <span className="text-2xl font-bold font-display text-foreground">{profilePct}%</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm text-muted-foreground text-center"
            >
              {steps[currentStep]?.microcopy}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Step list */}
        <div className="space-y-2">
          {steps.map((step, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: i <= currentStep ? 1 : 0.3, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  active ? "bg-primary/10 border border-primary/20" : "border border-transparent"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  done ? "bg-success/20" : active ? "bg-primary/20" : "bg-muted/30"
                }`}>
                  {done ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : active ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  )}
                </div>
                <span className={`text-sm ${done ? "text-success" : active ? "text-foreground font-medium" : "text-muted-foreground/50"}`}>
                  {step.label}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Final state */}
        {currentStep >= steps.length - 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.8 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary to-accent text-white text-sm font-bold"
            >
              <Check className="w-4 h-4" /> Profile Activated
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
