/**
 * CardAIPPQuickWin — Displays quick wins after reveal.
 */
import { motion } from "framer-motion";
import { Zap, CheckCircle } from "lucide-react";

interface QuickWin {
  title: string;
  impact: string;
}

interface Props {
  wins: QuickWin[];
  visible: boolean;
}

export default function CardAIPPQuickWin({ wins, visible }: Props) {
  if (!visible || wins.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold text-foreground">Gains rapides identifiés</span>
      </div>
      <div className="space-y-2">
        {wins.map((w, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-start gap-2"
          >
            <CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">{w.title}</p>
              <p className="text-[10px] text-muted-foreground">{w.impact}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
