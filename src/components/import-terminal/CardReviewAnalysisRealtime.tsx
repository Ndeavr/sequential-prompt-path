/**
 * CardReviewAnalysisRealtime — Progressive reputation reveal.
 */
import { motion } from "framer-motion";
import { Star, MessageSquare, TrendingUp } from "lucide-react";
import type { ImportData } from "@/hooks/useTerminalImportAnimation";

interface Props {
  data: ImportData;
  revealed: boolean;
}

export default function CardReviewAnalysisRealtime({ data, revealed }: Props) {
  if (!revealed) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border border-emerald-500/15 p-4 space-y-3"
      style={{ background: "linear-gradient(135deg, hsl(160 20% 6%) 0%, hsl(160 30% 4%) 100%)" }}
    >
      <h3 className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
        <MessageSquare className="w-4 h-4" /> Réputation analysée
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {data.averageRating !== undefined && (
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-lg font-bold text-foreground">{data.averageRating}</span>
            <span className="text-xs text-muted-foreground">/ 5</span>
          </div>
        )}
        {data.reviewCount !== undefined && (
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-lg font-bold text-foreground">{data.reviewCount}</span>
            <span className="text-xs text-muted-foreground">avis</span>
          </div>
        )}
      </div>
      {data.reviewThemes && data.reviewThemes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.reviewThemes.map((theme) => (
            <span key={theme} className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              {theme}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
