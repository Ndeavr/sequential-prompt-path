/**
 * WidgetAIPPDimensionBarsAnimated — Animated bars for AIPP sub-scores.
 */
import { motion } from "framer-motion";

interface Dimension {
  label: string;
  score: number;
  maxScore: number;
}

interface Props {
  dimensions: Dimension[];
  revealed: boolean;
}

function getBarColor(pct: number) {
  if (pct >= 80) return "bg-primary";
  if (pct >= 60) return "bg-green-500";
  if (pct >= 40) return "bg-yellow-500";
  return "bg-destructive";
}

export default function WidgetAIPPDimensionBarsAnimated({ dimensions, revealed }: Props) {
  return (
    <div className="space-y-3">
      {dimensions.map((dim, i) => {
        const pct = Math.round((dim.score / dim.maxScore) * 100);
        return (
          <div key={dim.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{dim.label}</span>
              <span className="font-semibold text-foreground">{revealed ? pct : 0}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${getBarColor(pct)}`}
                initial={{ width: "0%" }}
                animate={{ width: revealed ? `${pct}%` : "0%" }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.15, ease: "easeOut" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
