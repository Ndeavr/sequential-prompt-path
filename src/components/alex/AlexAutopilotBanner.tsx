/**
 * AlexAutopilotBanner — Contextual suggestion banner from Alex.
 * Renders as a subtle bottom card on mobile, adapts style per autopilot mode.
 */
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ArrowRight, Camera, BarChart3, Calendar, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AutopilotOutput } from "@/services/alexAutopilotEngine";

interface AlexAutopilotBannerProps {
  suggestion: AutopilotOutput | null;
  onAct: () => void;
  onDismiss: () => void;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  upload_photo: Camera,
  show_score: BarChart3,
  show_aipp_score: BarChart3,
  prepare_booking: Calendar,
  recommend_plan: Sparkles,
  show_prediction: Shield,
};

const MODE_STYLES: Record<string, { bg: string; border: string; glow: string }> = {
  passive: {
    bg: "bg-card/90",
    border: "border-border/40",
    glow: "",
  },
  guiding: {
    bg: "bg-card/95",
    border: "border-primary/30",
    glow: "",
  },
  assertive: {
    bg: "bg-primary/10",
    border: "border-primary/50",
    glow: "shadow-[0_0_20px_hsl(var(--primary)/0.15)]",
  },
  urgent: {
    bg: "bg-destructive/10",
    border: "border-destructive/50",
    glow: "shadow-[0_0_24px_hsl(var(--destructive)/0.2)]",
  },
};

export default function AlexAutopilotBanner({
  suggestion,
  onAct,
  onDismiss,
}: AlexAutopilotBannerProps) {
  if (!suggestion || suggestion.confidenceScore < 0.4) return null;

  const mode = MODE_STYLES[suggestion.autopilotMode] || MODE_STYLES.passive;
  const Icon = ACTION_ICONS[suggestion.recommendedAction] || Sparkles;

  return (
    <AnimatePresence>
      <motion.div
        key="autopilot-banner"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`
          fixed bottom-20 left-3 right-3 z-50
          sm:left-auto sm:right-4 sm:bottom-6 sm:max-w-sm
          rounded-2xl border backdrop-blur-xl p-4
          ${mode.bg} ${mode.border} ${mode.glow}
        `}
      >
        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Icon className="w-4.5 h-4.5 text-primary" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-sm font-medium text-foreground leading-snug">
              {suggestion.alexText}
            </p>

            {/* Momentum indicator */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
                {suggestion.autopilotMode === "urgent" ? "Urgent" : "Alex"}
              </span>
              <div className="flex gap-0.5">
                {["cold", "warming", "active", "ready_to_convert"].map((level, i) => {
                  const levels = ["cold", "warming", "active", "ready_to_convert"];
                  const currentIdx = levels.indexOf(suggestion.momentum);
                  return (
                    <div
                      key={level}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        i <= currentIdx ? "bg-primary" : "bg-muted-foreground/20"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        {suggestion.autopilotMode !== "passive" && (
          <Button
            size="sm"
            onClick={onAct}
            className="w-full mt-3 gap-2"
            variant={suggestion.autopilotMode === "urgent" ? "destructive" : "default"}
          >
            <span className="text-xs">
              {suggestion.autopilotMode === "assertive"
                ? "C'est parti"
                : suggestion.autopilotMode === "urgent"
                ? "Agir maintenant"
                : "Voir"}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
