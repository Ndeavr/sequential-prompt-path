/**
 * AlexOrbPanel — Always-visible Alex orb + speech bubble during onboarding.
 */
import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import type { OnboardingStep } from "@/pages/signature/PageAlexGuidedOnboarding";

interface Props {
  message: string;
  step: OnboardingStep;
}

export default function AlexOrbPanel({ message, step }: Props) {
  return (
    <div className="flex items-start gap-3 pt-4">
      {/* Orb */}
      <motion.div
        className="relative flex-shrink-0"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 flex items-center justify-center shadow-lg">
          <Bot className="w-6 h-6 text-primary" />
        </div>
        {/* Status dot */}
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
      </motion.div>

      {/* Speech bubble */}
      <motion.div
        key={step}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 rounded-2xl rounded-tl-md bg-card border border-border/40 p-4 shadow-sm"
      >
        <p className="text-[11px] font-semibold text-primary mb-1">Alex</p>
        <p className="text-sm text-foreground leading-relaxed">{message}</p>
      </motion.div>
    </div>
  );
}
