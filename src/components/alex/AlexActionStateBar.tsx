/**
 * AlexActionStateBar — Shows current processing state with animated indicators.
 * Appears below header during thinking/matching/preparing states.
 */
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Search, Calendar, Loader2 } from "lucide-react";
import type { AlexStep } from "@/hooks/useAlexSession";

interface AlexActionStateBarProps {
  step: AlexStep;
  className?: string;
}

const stateLabels: Partial<Record<AlexStep, { icon: typeof Sparkles; text: string; color: string }>> = {
  thinking: { icon: Sparkles, text: "Ok… je regarde ça.", color: "var(--primary)" },
  predicting: { icon: Search, text: "J'analyse votre projet…", color: "var(--secondary)" },
  matching: { icon: Search, text: "Je cherche le bon fit…", color: "var(--secondary)" },
  preparing_booking: { icon: Calendar, text: "Je vous prépare ça…", color: "var(--accent)" },
  opening_calendar: { icon: Calendar, text: "J'ouvre les disponibilités…", color: "var(--accent)" },
};

export default function AlexActionStateBar({ step, className = "" }: AlexActionStateBarProps) {
  const config = stateLabels[step];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        key={step}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className={`overflow-hidden ${className}`}
      >
        <div
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium border-b border-border/20"
          style={{ color: `hsl(${config.color})` }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Icon className="h-3.5 w-3.5" />
          </motion.div>
          <span>{config.text}</span>
          <motion.div
            className="flex gap-0.5 ml-auto"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1 h-1 rounded-full"
                style={{ background: `hsl(${config.color})` }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
