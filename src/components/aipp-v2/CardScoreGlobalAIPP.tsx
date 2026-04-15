import { motion } from "framer-motion";

interface Props {
  score: number;
  domain: string;
}

function getScoreColor(score: number) {
  if (score >= 70) return "text-green-400";
  if (score >= 45) return "text-amber-400";
  return "text-red-400";
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Bon";
  if (score >= 40) return "Moyen";
  if (score >= 20) return "Faible";
  return "Critique";
}

export default function CardScoreGlobalAIPP({ score, domain }: Props) {
  const circumference = 2 * Math.PI * 60;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 text-center">
      <p className="text-sm text-muted-foreground mb-1">Score AIPP v2</p>
      <p className="text-xs text-muted-foreground mb-4 truncate">{domain}</p>

      <div className="relative w-36 h-36 mx-auto mb-4">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="60" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <motion.circle
            cx="70" cy="70" r="60" fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`text-4xl font-bold ${getScoreColor(score)}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {score}
          </motion.span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>

      <p className={`text-sm font-semibold ${getScoreColor(score)}`}>{getScoreLabel(score)}</p>
    </div>
  );
}
