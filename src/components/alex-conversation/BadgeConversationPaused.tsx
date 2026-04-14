/**
 * BadgeConversationPaused — Subtle badge shown when Alex enters passive state.
 * Non-intrusive, premium feel.
 */
import { motion } from "framer-motion";
import { PauseCircle } from "lucide-react";

interface Props {
  visible: boolean;
}

export default function BadgeConversationPaused({ visible }: Props) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 backdrop-blur-sm border border-border/30 mx-auto w-fit"
    >
      <PauseCircle className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-[11px] text-muted-foreground font-medium">
        Conversation en pause
      </span>
    </motion.div>
  );
}
