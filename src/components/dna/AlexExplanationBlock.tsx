/**
 * UNPRO — Alex Explanation Block
 * Simple, human-readable explanation from Alex about a match.
 * Max 2 lines, zero jargon, conversational.
 */

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface AlexExplanationBlockProps {
  explanationFr: string;
  subExplanationFr?: string;
  variant?: "inline" | "card";
}

export default function AlexExplanationBlock({
  explanationFr,
  subExplanationFr,
  variant = "card",
}: AlexExplanationBlockProps) {
  if (variant === "inline") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-start gap-2 text-sm"
      >
        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-foreground font-medium">{explanationFr}</p>
          {subExplanationFr && (
            <p className="text-muted-foreground text-xs mt-0.5">{subExplanationFr}</p>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-gradient-to-br from-primary/5 via-card to-secondary/5 border border-primary/10 p-4 flex items-start gap-3"
    >
      <div className="rounded-xl bg-foreground p-2 shrink-0">
        <Sparkles className="h-4 w-4 text-background" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Alex</p>
        <p className="text-sm text-foreground leading-relaxed">{explanationFr}</p>
        {subExplanationFr && (
          <p className="text-xs text-muted-foreground mt-1">{subExplanationFr}</p>
        )}
      </div>
    </motion.div>
  );
}
