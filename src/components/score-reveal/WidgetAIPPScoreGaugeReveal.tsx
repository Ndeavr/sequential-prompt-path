/**
 * WidgetAIPPScoreGaugeReveal — Animated radial gauge for AIPP score.
 */
import { motion } from "framer-motion";

interface Props {
  score: number;
  revealed: boolean;
  size?: number;
}

function getScoreColor(score: number) {
  if (score >= 80) return "hsl(var(--primary))";
  if (score >= 60) return "hsl(142 71% 45%)";
  if (score >= 40) return "hsl(48 96% 53%)";
  return "hsl(0 84% 60%)";
}

function getScoreLevel(score: number) {
  if (score >= 80) return "Dominant";
  if (score >= 60) return "Solide";
  if (score >= 40) return "Moyen";
  return "Faible";
}

export default function WidgetAIPPScoreGaugeReveal({ score, revealed, size = 200 }: Props) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // semi-circle
  const progress = revealed ? (score / 100) * circumference : 0;
  const color = getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Animated arc */}
        <motion.path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      {revealed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="text-sm font-semibold"
          style={{ color }}
        >
          {getScoreLevel(score)}
        </motion.div>
      )}
    </div>
  );
}
