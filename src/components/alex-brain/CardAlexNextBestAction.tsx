import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  actionLabel: string;
  actionKey: string;
  message?: string;
  confidence?: number;
  onAction?: () => void;
}

export default function CardAlexNextBestAction({ actionLabel, actionKey, message, confidence, onAction }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Prochaine étape</p>
        {confidence !== undefined && (
          <span className="ml-auto text-[10px] text-muted-foreground">
            {Math.round(confidence * 100)}% confiance
          </span>
        )}
      </div>
      {message && (
        <p className="text-xs text-muted-foreground">{message}</p>
      )}
      <Button
        size="sm"
        className="w-full gap-2 rounded-xl"
        onClick={onAction}
      >
        {actionLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </motion.div>
  );
}
