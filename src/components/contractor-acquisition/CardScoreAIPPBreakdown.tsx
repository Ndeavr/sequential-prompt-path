/**
 * CardScoreAIPPBreakdown — Detailed AIPP score breakdown with pillar scores.
 */
import { motion } from "framer-motion";
import ScoreRing from "@/components/ui/score-ring";
import { cn } from "@/lib/utils";

interface Pillar {
  label: string;
  score: number;
  maxScore: number;
  icon: string;
}

interface Props {
  overallScore: number;
  pillars: Pillar[];
  businessName: string;
  className?: string;
}

const getScoreColor = (pct: number) =>
  pct >= 70 ? "bg-green-500" : pct >= 45 ? "bg-amber-500" : "bg-destructive";

export default function CardScoreAIPPBreakdown({ overallScore, pillars, businessName, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("glass-card rounded-2xl p-5 space-y-5", className)}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <ScoreRing score={overallScore} size={72} strokeWidth={6} label="AIPP" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate">{businessName}</h3>
          <p className="text-xs text-muted-foreground">
            {overallScore >= 70
              ? "Excellent — profil compétitif"
              : overallScore >= 45
              ? "Moyen — améliorations possibles"
              : "Faible — opportunités manquées"}
          </p>
        </div>
      </div>

      {/* Pillars */}
      <div className="space-y-3">
        {pillars.map((p, i) => {
          const pct = Math.round((p.score / p.maxScore) * 100);
          return (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
              className="space-y-1"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {p.icon} {p.label}
                </span>
                <span className="font-semibold text-foreground">
                  {p.score}/{p.maxScore}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.6, ease: "easeOut" }}
                  className={cn("h-full rounded-full", getScoreColor(pct))}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
