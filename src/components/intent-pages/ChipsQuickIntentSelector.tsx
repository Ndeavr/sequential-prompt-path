/**
 * ChipsQuickIntentSelector — Quick-tap intent chips for instant engagement.
 */
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface IntentChip {
  id: string;
  label: string;
  icon?: LucideIcon;
  emoji?: string;
}

interface Props {
  chips: IntentChip[];
  onSelect: (chip: IntentChip) => void;
  className?: string;
}

export default function ChipsQuickIntentSelector({ chips, onSelect, className }: Props) {
  return (
    <div className={cn("flex flex-wrap justify-center gap-2 px-5", className)}>
      {chips.map((chip, i) => {
        const Icon = chip.icon;
        return (
          <motion.button
            key={chip.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 * i, duration: 0.25 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(chip)}
            className="flex items-center gap-1.5 rounded-full border border-border/50 bg-card/60 backdrop-blur-sm px-3.5 py-2 text-xs sm:text-sm font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            {chip.emoji && <span>{chip.emoji}</span>}
            {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
            {chip.label}
          </motion.button>
        );
      })}
    </div>
  );
}
