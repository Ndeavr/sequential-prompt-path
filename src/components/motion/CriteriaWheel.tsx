/**
 * CriteriaWheel — Half-circle SVG with criteria ticks that snap into place.
 * Lazy-loaded by MatchingDoubleWheel.
 */
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  side: "left" | "right";
  criteria: string[];
  /** Index of criteria currently active (0..criteria.length) */
  activeIndex: number;
  matched?: boolean;
  size?: number;
  className?: string;
}

export default function CriteriaWheel({
  side,
  criteria,
  activeIndex,
  matched = false,
  size = 220,
  className,
}: Props) {
  const reduce = useReducedMotion();
  const radius = size / 2 - 14;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = side === "left" ? 90 : -90;
  const endAngle = side === "left" ? 270 : 90;
  const total = criteria.length;
  const [snap, setSnap] = useState(false);

  useEffect(() => {
    if (matched && !reduce) {
      setSnap(true);
      const t = window.setTimeout(() => setSnap(false), 400);
      return () => clearTimeout(t);
    }
  }, [matched, reduce]);

  const tickPositions = criteria.map((_, i) => {
    const a = startAngle + ((endAngle - startAngle) * (i + 1)) / (total + 1);
    const rad = (a * Math.PI) / 180;
    return {
      x: cx + Math.cos(rad) * radius,
      y: cy + Math.sin(rad) * radius,
      angle: a,
    };
  });

  return (
    <motion.div
      className={cn("relative", className)}
      style={{ width: size, height: size }}
      animate={snap ? { scale: [1, 1.06, 1] } : {}}
      transition={{ duration: 0.4, ease: [0.7, 0, 0.2, 1] }}
    >
      <svg width={size} height={size} className="absolute inset-0">
        <defs>
          <linearGradient id={`wheel-${side}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={radius} stroke="hsl(var(--border))" strokeWidth={1.5} fill="none" />
        {tickPositions.map((p, i) => {
          const active = i < activeIndex;
          return (
            <g key={i}>
              <motion.circle
                cx={p.x}
                cy={p.y}
                r={active ? 7 : 4}
                fill={active ? `url(#wheel-${side})` : "hsl(var(--muted))"}
                initial={{ scale: 0.6, opacity: 0.4 }}
                animate={{ scale: active ? 1 : 0.85, opacity: active ? 1 : 0.5 }}
                transition={{ duration: 0.22, ease: [0.7, 0, 0.2, 1] }}
              />
            </g>
          );
        })}
      </svg>
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 text-xs text-muted-foreground space-y-1.5",
          side === "left" ? "left-2" : "right-2 text-right",
        )}
      >
        {criteria.map((c, i) => (
          <div
            key={c}
            className={cn(
              "transition-opacity",
              i < activeIndex ? "opacity-100 text-foreground font-medium" : "opacity-50",
            )}
          >
            {c}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
