/**
 * <SmartProfileProgressBar> — sticky bar showing profile completion %
 * + the single next-best action to gain the most points.
 */
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Props {
  score: number;
  nextActionLabel?: string;
  nextActionGain?: number;
  onAct?: () => void;
  sticky?: boolean;
}

export function SmartProfileProgressBar({
  score,
  nextActionLabel,
  nextActionGain,
  onAct,
  sticky = true,
}: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const wrapperClass = sticky
    ? "fixed inset-x-0 bottom-0 z-40 px-3 pb-3"
    : "px-3";

  return (
    <div className={wrapperClass}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-2xl rounded-[22px] border border-border/40 bg-card/95 backdrop-blur-xl p-3 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-foreground">
                Profil {pct}%
              </p>
              {nextActionLabel && (
                <p className="text-[11px] text-primary font-medium truncate flex items-center gap-1">
                  <Sparkles className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    +{nextActionGain ?? 5}% si {nextActionLabel}
                  </span>
                </p>
              )}
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
          {nextActionLabel && onAct && (
            <button
              type="button"
              onClick={onAct}
              className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-xl bg-primary text-primary-foreground hover:-translate-y-0.5 transition-transform"
              style={{ transitionTimingFunction: "cubic-bezier(.22,1,.36,1)" }}
              aria-label="Agir maintenant"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default SmartProfileProgressBar;
