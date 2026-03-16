/**
 * Segmented circular score ring with animation
 */
import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { factors, SCORE_CURRENT, SCORE_TOTAL } from "./data";

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

export default function AuthorityScoreRing() {
  const size = 260;
  const stroke = 14;
  const gap = 4;
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const totalMax = factors.reduce((s, f) => s + f.max, 0);

  let currentAngle = 0;
  const segments = factors.map((f) => {
    const segmentLength = (f.max / totalMax) * circumference;
    const filledLength = (f.value / totalMax) * circumference;
    const offset = circumference - currentAngle;
    currentAngle += segmentLength;
    return { ...f, segmentLength, filledLength, offset, gapOffset: gap };
  });

  return (
    <div className="relative flex flex-col items-center gap-4">
      {/* Glow */}
      <div className="absolute w-48 h-48 rounded-full bg-primary/8 blur-3xl top-4" />

      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="hsl(228 20% 10%)" strokeWidth={stroke}
          />
          {/* Segments */}
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
              transition={{ duration: 1, ease: "easeOut", delay: 0.3 + i * 0.12 }}
              style={{ filter: `drop-shadow(0 0 4px ${seg.color})` }}
            />
          ))}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold font-display text-foreground tracking-tight">
            <AnimatedNumber target={SCORE_CURRENT} />
          </span>
          <span className="text-sm text-muted-foreground font-medium">/ {SCORE_TOTAL}</span>
          <span className="text-[11px] text-muted-foreground/70 mt-1">Score actuel</span>
        </div>
      </div>

      {/* Points available */}
      <motion.p
        className="text-sm font-medium text-success"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6 }}
      >
        +220 points possibles rapidement
      </motion.p>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-1">
        {factors.map((f) => (
          <div key={f.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full" style={{ background: f.color }} />
            <span>{f.label}</span>
            <span className="text-foreground/70 font-medium tabular-nums">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
