import { Shield, ArrowUp } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

interface Props {
  score: number;
  suggestions: string[];
}

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excellent", color: "text-green-500" };
  if (score >= 60) return { label: "Bon", color: "text-primary" };
  if (score >= 40) return { label: "À améliorer", color: "text-yellow-500" };
  return { label: "Faible", color: "text-destructive" };
}

export function AlexAIPPScoreCard({ score, suggestions }: Props) {
  const { label, color } = getScoreLabel(score);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-border bg-card p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Shield className="w-4 h-4 text-primary" />
          Score AIPP
        </div>
        <span className={`text-xs font-medium ${color}`}>{label}</span>
      </div>

      <div className="text-center">
        <div className="text-4xl font-bold text-foreground">{score}</div>
        <div className="text-xs text-muted-foreground">/100</div>
        <Progress value={score} className="mt-3 h-2" />
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <ArrowUp className="w-3 h-3" /> Pour améliorer votre score
          </div>
          {suggestions.map((s, i) => (
            <div key={i} className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
              {s}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
