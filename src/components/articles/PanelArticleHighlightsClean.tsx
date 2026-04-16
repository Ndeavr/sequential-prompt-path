/**
 * UNPRO — PanelArticleHighlightsClean
 * Displays key takeaways without duplication (no author name in highlights).
 */
import { Lightbulb } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  takeaways: string[];
  authorName?: string;
}

/** Deduplicates and filters out author mentions from takeaways */
function cleanTakeaways(takeaways: string[], authorName?: string): string[] {
  const seen = new Set<string>();
  return takeaways.filter((t) => {
    const normalized = t.toLowerCase().trim();
    // Skip if duplicate
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    // Skip if it's just the author name
    if (authorName && normalized === authorName.toLowerCase().trim()) return false;
    // Skip very short items
    if (normalized.length < 10) return false;
    return true;
  });
}

export default function PanelArticleHighlightsClean({ takeaways, authorName }: Props) {
  const clean = cleanTakeaways(takeaways, authorName);
  if (clean.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2.5"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <Lightbulb className="h-4 w-4" />
        Points clés
      </div>
      <ul className="space-y-2">
        {clean.map((t, i) => (
          <li key={i} className="text-sm text-foreground/90 flex items-start gap-2.5">
            <span className="text-primary mt-0.5 shrink-0 text-xs">●</span>
            <span className="leading-relaxed">{t}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
