/**
 * AIPPScoreDial — SVG dial that scans then reveals the AIPP score digits.
 */
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  score: number;
  revealed?: boolean;
  size?: number;
  className?: string;
  label?: string;
}

export default function AIPPScoreDial({
  score,
  revealed = true,
  size = 160,
  className,
  label = "Score AIPP",
}: Props) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(revealed ? score : 0);
  const radius = size / 2 - 10;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score)) / 100;

  useEffect(() => {
    if (!revealed || reduce) {
      setDisplay(revealed ? score : 0);
      return;
    }
    let raf: number;
    const start = performance.now();
    const dur = 900;
    const from = 0;
    const to = score;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [revealed, score, reduce]);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <defs>
          <linearGradient id="aipp-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(var(--border))" strokeWidth={6} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#aipp-grad)"
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: revealed ? circ * (1 - pct) : circ }}
          transition={{ duration: reduce ? 0 : 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="relative z-10 text-center">
        <div className="text-4xl font-display font-bold text-foreground tabular-nums">{display}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  );
}
