/**
 * PotentialScoreCard — Animation score actuel → score potentiel après optimisation.
 * Compteur progressif sur 1.6s.
 */
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface Props {
  currentScore: number;
  potentialScore: number;
}

export default function PotentialScoreCard({ currentScore, potentialScore }: Props) {
  const mv = useMotionValue(currentScore);
  const rounded = useTransform(mv, (v) => Math.round(v));
  const [displayed, setDisplayed] = useState(currentScore);

  useEffect(() => {
    const controls = animate(mv, potentialScore, {
      duration: 1.6,
      ease: [0.22, 1, 0.36, 1],
    });
    const unsub = rounded.on("change", (v) => setDisplayed(v));
    return () => {
      controls.stop();
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [potentialScore]);

  const delta = potentialScore - currentScore;
  const pct = Math.max(0, Math.min(100, displayed));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border border-border/50 p-5 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Score potentiel après optimisation
          </p>
          <p className="text-[11.5px] text-muted-foreground mt-0.5">
            Actuel : <span className="font-semibold text-foreground">{currentScore}</span> · Potentiel :{" "}
            <span className="font-semibold text-primary">{potentialScore}</span>
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-1 text-[11px] font-bold">
          <Sparkles className="h-3 w-3" />+{delta}
        </span>
      </div>

      <div className="relative h-3 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary-glow"
          style={{ width: `${pct}%` }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <div className="mt-3 flex items-baseline justify-center gap-1">
        <span className="text-4xl font-black text-foreground tabular-nums">{displayed}</span>
        <span className="text-sm text-muted-foreground">/ 100</span>
      </div>
    </motion.div>
  );
}
