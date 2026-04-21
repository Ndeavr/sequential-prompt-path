/**
 * Alex 100M — Quick Actions
 * Premium action chips. Click = valid engagement.
 */

import { motion } from "framer-motion";
import { useAlexStore } from "./state/alexStore";

interface AlexQuickActionsProps {
  onSelect: (actionKey: string) => void;
}

export function AlexQuickActions({ onSelect }: AlexQuickActionsProps) {
  const quickActions = useAlexStore((s) => s.quickActions);
  const lang = useAlexStore((s) => s.activeLanguage);

  if (quickActions.length === 0) return null;

  return (
    <div className="px-4 py-2 flex flex-wrap gap-2">
      {quickActions.map((action, i) => (
        <motion.button
          key={action.key}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.2 }}
          onClick={() => onSelect(action.key)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border/40 bg-card/60 hover:bg-primary/10 hover:border-primary/30 text-foreground/80 hover:text-foreground transition-all duration-200"
        >
          {action.icon && <span className="text-sm">{action.icon}</span>}
          <span>{lang === "fr-CA" ? action.labelFr : action.labelEn}</span>
        </motion.button>
      ))}
    </div>
  );
}
