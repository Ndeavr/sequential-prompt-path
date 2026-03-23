/**
 * UNPRO — CCAI Score Ring
 * Premium animated ring displaying CCAI compatibility score.
 */

import { motion } from "framer-motion";

interface CCAIScoreRingProps {
  score: number; // 0-100
  label?: string;
  size?: number;
  showPercentage?: boolean;
}

export default function CCAIScoreRing({
  score,
  label,
  size = 120,
  showPercentage = true,
}: CCAIScoreRingProps) {
  const strokeWidth = size > 100 ? 10 : 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 75) return "hsl(var(--success))";
    if (score >= 50) return "hsl(var(--warning))";
    return "hsl(var(--destructive))";
  };

  const getGlowColor = () => {
    if (score >= 75) return "hsl(var(--success) / 0.3)";
    if (score >= 50) return "hsl(var(--warning) / 0.3)";
    return "hsl(var(--destructive) / 0.3)";
  };

  const getLabelFr = () => {
    if (score >= 80) return "Match élevé";
    if (score >= 65) return "Très compatible";
    if (score >= 50) return "Compatible";
    if (score >= 35) return "Prudence";
    return "Peu compatible";
  };

  return (
    <div className="relative inline-flex flex-col items-center gap-2">
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          filter: `drop-shadow(0 0 12px ${getGlowColor()})`,
        }}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showPercentage && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="text-2xl font-bold text-foreground"
            >
              {score}
            </motion.span>
          )}
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            CCAI
          </span>
        </div>
      </div>
      <span className="text-xs font-semibold text-muted-foreground">
        {label || getLabelFr()}
      </span>
    </div>
  );
}
