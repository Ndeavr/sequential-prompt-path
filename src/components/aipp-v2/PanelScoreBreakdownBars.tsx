import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import type { AIPPv2AuditScores } from "@/hooks/useAIPPv2Audit";

interface Props {
  scores: AIPPv2AuditScores;
}

const DIMENSIONS = [
  { key: "score_aeo", label: "Visibilité IA (AEO)", weight: "30%" },
  { key: "score_authority", label: "Autorité & Confiance", weight: "20%" },
  { key: "score_conversion", label: "Conversion", weight: "20%" },
  { key: "score_local", label: "Présence locale", weight: "15%" },
  { key: "score_tech", label: "SEO technique", weight: "15%" },
] as const;

function getBarColor(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 45) return "bg-amber-500";
  return "bg-red-500";
}

function getTextColor(score: number): string {
  if (score >= 70) return "text-green-500";
  if (score >= 45) return "text-amber-500";
  return "text-red-500";
}

export default function PanelScoreBreakdownBars({ scores }: Props) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Détail transparent du score</h3>
      </div>

      <div className="space-y-3">
        {DIMENSIONS.map(({ key, label, weight }, i) => {
          const value = scores[key];
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground/60">×{weight}</span>
                  <span className={`text-xs font-bold ${getTextColor(value)}`}>{value}</span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${getBarColor(value)}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 0.8, delay: i * 0.12, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">Score global pondéré</span>
        <span className={`text-lg font-bold ${getTextColor(scores.score_global)}`}>{scores.score_global}/100</span>
      </div>
    </div>
  );
}
