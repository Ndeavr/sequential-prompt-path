/**
 * BarStickyCounterRealtime — Sticky bar with rotating metrics (soumissions, heures, publicité).
 * Cycles through 3 metrics with vertical slide animation.
 * Clicking navigates to the full counter detail page.
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useImpactCounter } from "@/hooks/useImpactCounter";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

function formatFull(n: number): string {
  return Math.floor(n).toLocaleString("fr-CA");
}

const METRICS = [
  { key: "submissions", label: "soumissions évitées", getValue: (s: any) => formatFull(s.savedSubmissions) },
  { key: "hours", label: "heures récupérées", getValue: (s: any) => formatFull(s.hoursSaved) },
  { key: "dollars", label: "publicité épargnée", getValue: (s: any) => formatFull(s.adSavingsCad) + " $" },
] as const;

interface Props {
  threshold?: number;
  className?: string;
}

export default function BarStickyCounterRealtime({
  threshold = 400,
  className,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const snap = useImpactCounter("realiste");
  const { openAlex } = useAlexVoice();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  // Rotate every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % METRICS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const metric = METRICS[activeIdx];

  const handleCounterClick = useCallback(() => {
    navigate("/impact");
  }, [navigate]);

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
              className="flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-br from-primary via-secondary to-accent shadow-sm flex-shrink-0"
            >
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </button>

            {/* Clickable counter area → navigates to /impact */}
            <button
              onClick={handleCounterClick}
              className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
            >
              {/* LIVE badge */}
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary flex-shrink-0">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                </span>
                LIVE
              </span>

              {/* Rotating metric */}
              <div className="relative h-5 overflow-hidden min-w-[140px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={metric.key}
                    initial={{ y: 14, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -14, opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="absolute inset-0 flex items-center gap-1.5"
                  >
                    <span className="text-xs sm:text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">
                      {metric.getValue(snap)}
                    </span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap truncate">
                      {metric.label}
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Rotation dots indicator */}
              <div className="flex gap-0.5 flex-shrink-0">
                {METRICS.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 w-1 rounded-full transition-colors duration-300",
                      i === activeIdx ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
