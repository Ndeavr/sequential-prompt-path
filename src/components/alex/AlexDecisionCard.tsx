/**
 * AlexDecisionCard — Shows the current God Mode decision with action.
 */
import { motion } from "framer-motion";
import { Sparkles, ChevronRight, Zap, AlertTriangle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GodDecision } from "@/services/alexGodModeEngine";

const TYPE_ICONS = {
  activate_module: Zap,
  launch_workflow: Sparkles,
  create_task: Sparkles,
  trigger_agent: Sparkles,
  escalate: AlertTriangle,
  wait: Eye,
};

interface AlexDecisionCardProps {
  decision: GodDecision;
  onAct?: () => void;
  onDismiss?: () => void;
}

export default function AlexDecisionCard({ decision, onAct, onDismiss }: AlexDecisionCardProps) {
  if (decision.type === "wait") return null;

  const Icon = TYPE_ICONS[decision.type] || Sparkles;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug">
            {decision.alexText}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Confiance : {Math.round(decision.confidence * 100)}%
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onAct}
          className="flex-1 rounded-xl h-9 text-xs gap-1.5"
        >
          Continuer <ChevronRight className="h-3 w-3" />
        </Button>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="rounded-xl h-9 text-xs text-muted-foreground"
          >
            Pas maintenant
          </Button>
        )}
      </div>
    </motion.div>
  );
}
