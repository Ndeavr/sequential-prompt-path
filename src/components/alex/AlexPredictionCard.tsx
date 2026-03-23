/**
 * AlexPredictionCard — Shows proactive prediction from Reality Engine.
 */
import { motion } from "framer-motion";
import { TrendingUp, AlertTriangle, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AlexPredictionCardProps {
  title: string;
  description: string;
  urgency: "low" | "medium" | "high";
  confidence: number;
  onAct?: () => void;
  onDismiss?: () => void;
}

export default function AlexPredictionCard({
  title,
  description,
  urgency,
  confidence,
  onAct,
  onDismiss,
}: AlexPredictionCardProps) {
  const urgencyColors = {
    low: "border-muted text-muted-foreground",
    medium: "border-amber-500/30 text-amber-600",
    high: "border-destructive/30 text-destructive",
  };

  const UrgencyIcon = urgency === "high" ? AlertTriangle : urgency === "medium" ? TrendingUp : Sparkles;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`rounded-2xl border ${urgencyColors[urgency].split(" ")[0]} bg-card/80 backdrop-blur-sm p-4 space-y-3`}
    >
      <div className="flex items-start gap-3">
        <div className={`h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0`}>
          <UrgencyIcon className={`h-4 w-4 ${urgencyColors[urgency].split(" ")[1]}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1.5">
            Confiance {Math.round(confidence * 100)}%
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onAct && (
          <Button size="sm" variant="outline" onClick={onAct} className="rounded-xl h-8 text-xs gap-1 flex-1">
            Voir <ChevronRight className="h-3 w-3" />
          </Button>
        )}
        {onDismiss && (
          <Button size="sm" variant="ghost" onClick={onDismiss} className="rounded-xl h-8 text-xs text-muted-foreground">
            Plus tard
          </Button>
        )}
      </div>
    </motion.div>
  );
}
