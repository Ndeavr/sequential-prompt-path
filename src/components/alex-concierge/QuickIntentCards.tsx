/**
 * QuickIntentCards — Fast intent selection cards.
 * No question. Just tap → intent detected → match starts.
 */
import { motion } from "framer-motion";
import type { QuickIntent } from "@/services/alexStateMachine";

interface Props {
  intents: QuickIntent[];
  onSelect: (intent: QuickIntent) => void;
}

export default function QuickIntentCards({ intents, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2.5 w-full max-w-md mx-auto">
      {intents.map((intent, i) => (
        <motion.button
          key={intent.category}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          onClick={() => onSelect(intent)}
          className="flex items-center gap-2.5 px-4 py-3.5 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
        >
          <span className="text-lg">{intent.icon}</span>
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
            {intent.label}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
