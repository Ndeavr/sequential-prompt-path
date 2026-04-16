/**
 * BarStickyCounterRealtime — Sticky bar with Alex mini orb, counter, and LIVE badge.
 * Replaces the simpler StickyMiniCounterBar.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useImpactCounter } from "@/hooks/useImpactCounter";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { cn } from "@/lib/utils";

function formatFull(n: number): string {
  return Math.floor(n).toLocaleString("fr-CA");
}

interface Props {
  threshold?: number;
  intentLabel?: string;
  metricType?: "submissions" | "hours" | "dollars";
  className?: string;
}

export default function BarStickyCounterRealtime({
  threshold = 400,
  intentLabel = "soumissions évitées",
  metricType = "submissions",
  className,
}: Props) {
  const [visible, setVisible] = useState(false);
  const snap = useImpactCounter("realiste");
  const { openAlex } = useAlexVoice();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  const value = metricType === "submissions"
    ? formatFull(snap.savedSubmissions)
    : metricType === "hours"
      ? formatFull(snap.hoursSaved)
      : formatFull(snap.adSavingsCad) + " $";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={cn(
            "fixed top-0 left-0 right-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/30 py-1.5 px-4",
            className
          )}
        >
          <div className="max-w-5xl mx-auto flex items-center justify-center gap-3">
            {/* Alex mini orb */}
            <button
              onClick={() => openAlex("sticky_bar")}
              className="flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-br from-primary via-secondary to-accent shadow-sm"
            >
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </button>

            {/* LIVE badge */}
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
              </span>
              LIVE
            </span>

            {/* Counter */}
            <span className="text-xs sm:text-sm font-semibold text-foreground tabular-nums">
              {value}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {intentLabel}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
