/**
 * UNPRO — VerificationScoreRing
 * Animated SVG score ring with color coding.
 */
import { motion } from "framer-motion";

interface Props {
  score: number;
  label: string;
  size?: number;
  strokeWidth?: number;
}

export default function VerificationScoreRing({ score, label, size = 88, strokeWidth = 5 }: Props) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const color =
    score >= 70 ? "hsl(var(--success))" :
    score >= 40 ? "hsl(var(--warning))" :
    "hsl(var(--destructive))";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-xl font-bold font-display text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score}
          </motion.span>
        </div>
      </div>
      <span className="text-caption font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
