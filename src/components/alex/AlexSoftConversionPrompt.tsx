/**
 * AlexSoftConversionPrompt — Contextual micro-copy bubble.
 * Shows persuasion text naturally within conversation.
 */
import { motion } from "framer-motion";
import type { PersuasionStyle } from "@/services/alexPersuasionEngine";

interface Props {
  text: string;
  style: PersuasionStyle;
  className?: string;
}

const STYLE_COLORS: Record<PersuasionStyle, string> = {
  reassuring: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
  momentum: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
  effort_reduction: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
  light_scarcity: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800",
};

export default function AlexSoftConversionPrompt({ text, style, className = "" }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`px-4 py-2.5 rounded-2xl rounded-bl-sm border text-sm text-foreground max-w-[85%] ${STYLE_COLORS[style]} ${className}`}
    >
      {text}
    </motion.div>
  );
}
