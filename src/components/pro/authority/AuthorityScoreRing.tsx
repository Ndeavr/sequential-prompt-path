/**
 * Authority Score Ring V2 — Segmented ring for 8 dimensions on /100 scale
 */
import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import type { AuthorityDimensions } from "@/services/authorityScoreV2";
import { DIMENSION_META } from "@/services/authorityScoreV2";
import { dimensionsToFactors, SCORE_TOTAL } from "./data";

function AnimatedNumber({ target, duration = 1.6, delay = 0.3 }: { target: number; duration?: number; delay?: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const delayMs = delay * 1000;
    const durationMs = duration * 1000;
    const tick = (now: number) => {
      const elapsed = now - start - delayMs;
      if (elapsed < 0) { requestAnimationFrame(tick); return; }
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration, delay]);

  return <span ref={ref}>{value}</span>;
}

interface Props {
  overall: number;
  dimensions: AuthorityDimensions;
  tier: string;
  confidence: number;
}

export default function AuthorityScoreRing({ overall, dimensions, tier, confidence }: Props) {
  const size = 260;
  const stroke = 14;
  const gap = 3;
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const factors = dimensionsToFactors(dimensions);
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);

  let currentAngle = 0;
  const segments = factors.map((f) => {
    const segmentLength = (f.weight / totalWeight) * circumference;
    const filledLength = (f.value / 100) * segmentLength;
    const offset = circumference - currentAngle;
    currentAngle += segmentLength;
    return { ...f, segmentLength, filledLength, offset, gapOffset: gap };
  });

  return (
    <div className="relative flex flex-col items-center gap-4">
      <div className="absolute w-48 h-48 rounded-full bg-primary/8 blur-3xl top-4" />

      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="hsl(228 20% 10%)" strokeWidth={stroke}
          />
          {segments.map((seg, i) => (
            <motion.circle
              key={seg.key}
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke - 2}
              strokeLinecap="round"
              strokeDasharray={`${seg.filledLength - seg.gapOffset} ${circumference - seg.filledLength + seg.gapOffset}`}
              strokeDashoffset={seg.offset}
              initial={{ opacity: 0, strokeDashoffset: seg.offset + seg.filledLength }}
              animate={{ opacity: 1, strokeDashoffset: seg.offset }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.3 + i * 0.1 }}
              style={{ filter: `drop-shadow(0 0 4px ${seg.color})` }}
            />
          ))}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold font-display text-foreground tracking-tight">
            <AnimatedNumber target={overall} />
          </span>
          <span className="text-sm text-muted-foreground font-medium">/ {SCORE_TOTAL}</span>
          <span className="text-[11px] text-muted-foreground/70 mt-1">Score réel</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-foreground capitalize">{tier}</span>
        <span className="text-[10px] text-muted-foreground">· Confiance {Math.round(confidence * 100)}%</span>
      </div>

      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-1">
        {factors.map((f) => (
          <div key={f.key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <div className="w-2 h-2 rounded-full" style={{ background: f.color }} />
            <span className="truncate max-w-[100px]">{f.label}</span>
            <span className="text-foreground/70 font-medium tabular-nums">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
