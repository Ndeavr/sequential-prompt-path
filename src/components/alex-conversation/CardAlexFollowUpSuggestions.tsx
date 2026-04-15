/**
 * CardAlexFollowUpSuggestions — Contextual next-step buttons after Alex response.
 */
import { motion } from "framer-motion";

interface Props {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export default function CardAlexFollowUpSuggestions({ suggestions, onSelect }: Props) {
  if (!suggestions.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="flex flex-wrap gap-2 pt-2"
    >
      {suggestions.map((suggestion, i) => (
        <motion.button
          key={suggestion}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 * i }}
          onClick={() => onSelect(suggestion)}
          className="px-3 py-1.5 text-xs rounded-full border border-border/50 bg-card/50 text-foreground hover:bg-primary/10 hover:border-primary/30 transition-all duration-200"
        >
          {suggestion}
        </motion.button>
      ))}
    </motion.div>
  );
}
