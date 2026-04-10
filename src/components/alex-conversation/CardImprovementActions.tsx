import { motion } from "framer-motion";
import { Zap, ChevronRight } from "lucide-react";

interface Props {
  actions: string[];
  onActionClick?: (action: string) => void;
}

export default function CardImprovementActions({ actions, onActionClick }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-2"
    >
      <div className="flex items-center gap-1.5">
        <Zap className="w-4 h-4 text-primary" />
        <p className="text-xs font-semibold text-foreground">Actions prioritaires</p>
      </div>
      {actions.map((action, i) => (
        <motion.button
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          onClick={() => onActionClick?.(action)}
          className="w-full flex items-center gap-2 text-xs text-left p-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors group"
        >
          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
            {i + 1}
          </span>
          <span className="flex-1 text-foreground/80">{action}</span>
          <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
        </motion.button>
      ))}
    </motion.div>
  );
}
