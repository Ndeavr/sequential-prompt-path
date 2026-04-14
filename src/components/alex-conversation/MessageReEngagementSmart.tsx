/**
 * MessageReEngagementSmart — Renders a re-engagement message from Alex.
 * Styled as a subtle system-level nudge, not a regular chat bubble.
 */
import { motion } from "framer-motion";
import { Bot } from "lucide-react";

interface Props {
  text: string;
  index: number;
}

export default function MessageReEngagementSmart({ text, index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
      className="flex items-start gap-2.5 px-4 py-2"
    >
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-primary/60" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-muted-foreground/80 leading-relaxed italic">
          {text}
        </p>
        {index === 3 && (
          <span className="text-[10px] text-muted-foreground/50 mt-1 block">
            Alex reste disponible
          </span>
        )}
      </div>
    </motion.div>
  );
}
