/**
 * UNPRO — Recommended Action Widget
 */
import { motion } from "framer-motion";
import { Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  actionType?: string;
  actionLabel?: string;
  reasoning?: string;
  priority?: number;
  onAction?: () => void;
}

const actionConfig: Record<string, { icon: string; color: string }> = {
  call: { icon: "📞", color: "bg-primary/10 border-primary/20" },
  nurture: { icon: "🌱", color: "bg-emerald-500/10 border-emerald-500/20" },
  visit: { icon: "📍", color: "bg-blue-500/10 border-blue-500/20" },
  follow_up: { icon: "🔄", color: "bg-violet-500/10 border-violet-500/20" },
  qualify: { icon: "🎯", color: "bg-orange-500/10 border-orange-500/20" },
  close: { icon: "✅", color: "bg-emerald-500/10 border-emerald-500/20" },
  escalate: { icon: "🚨", color: "bg-red-500/10 border-red-500/20" },
};

export default function WidgetRecommendedAction({ actionType, actionLabel, reasoning, priority, onAction }: Props) {
  const config = actionConfig[actionType || ""] || { icon: "⚡", color: "bg-muted/20 border-border/20" };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`rounded-xl border ${config.color} p-3 space-y-2`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <div>
            <p className="text-xs font-semibold text-foreground">Prochaine action</p>
            <p className="text-[10px] text-muted-foreground capitalize">{actionLabel || actionType?.replace(/_/g, " ") || "—"}</p>
          </div>
        </div>
        {priority != null && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/15 text-primary">P{priority}</span>
        )}
      </div>
      {reasoning && (
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">{reasoning}</p>
      )}
      {onAction && (
        <Button size="sm" variant="ghost" onClick={onAction} className="w-full h-7 text-xs gap-1">
          Exécuter <ArrowRight className="h-3 w-3" />
        </Button>
      )}
    </motion.div>
  );
}
