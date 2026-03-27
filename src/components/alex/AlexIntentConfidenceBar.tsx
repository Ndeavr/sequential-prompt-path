/**
 * AlexIntentConfidenceBar — Visual intent/readiness indicator.
 * Shows booking readiness, trust, friction as a compact bar.
 */
import { motion } from "framer-motion";

interface Props {
  bookingReadiness: number;
  trustScore: number;
  frictionScore: number;
  className?: string;
}

export default function AlexIntentConfidenceBar({ bookingReadiness, trustScore, frictionScore, className = "" }: Props) {
  const readinessPercent = Math.round(bookingReadiness * 100);
  const color =
    readinessPercent > 70 ? "bg-green-500" :
    readinessPercent > 40 ? "bg-amber-500" :
    "bg-muted-foreground/40";

  return (
    <div className={`flex items-center gap-3 text-xs text-muted-foreground ${className}`}>
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span>Prêt à réserver</span>
          <span className="font-medium">{readinessPercent}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${color}`}
            initial={{ width: 0 }}
            animate={{ width: `${readinessPercent}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <span title="Confiance" className={trustScore > 0.6 ? "text-green-600" : "text-amber-500"}>
          🛡 {Math.round(trustScore * 100)}
        </span>
        <span title="Friction" className={frictionScore < 0.3 ? "text-green-600" : "text-red-400"}>
          ⚡ {Math.round((1 - frictionScore) * 100)}
        </span>
      </div>
    </div>
  );
}
