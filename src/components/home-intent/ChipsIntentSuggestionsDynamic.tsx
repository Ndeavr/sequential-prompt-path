/**
 * ChipsIntentSuggestionsDynamic — Seasonal/popular intent suggestions as clickable chips.
 */
import { motion } from "framer-motion";

interface ChipsProps {
  onSelect: (text: string) => void;
}

const SUGGESTIONS = [
  "Isolation grenier",
  "Toiture qui coule",
  "Urgence plomberie",
  "Rénovation cuisine",
  "Notaire achat maison",
  "Thermopompe",
];

export default function ChipsIntentSuggestionsDynamic({ onSelect }: ChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {SUGGESTIONS.map((s, i) => (
        <motion.button
          key={s}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 + i * 0.07 }}
          onClick={() => onSelect(s)}
          className="px-4 py-2 rounded-full text-meta font-medium
            bg-muted/60 border border-border/60 text-muted-foreground
            hover:bg-primary/15 hover:text-primary hover:border-primary/40
            transition-all duration-200 active:scale-95"
        >
          {s}
        </motion.button>
      ))}
    </div>
  );
}
