/**
 * UNPRO — Zone Value Score Widget
 */
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, TrendingUp } from "lucide-react";

interface Props {
  score: number;
  citySlug: string;
  tradeSlug: string;
  isLoading?: boolean;
}

export default function WidgetZoneValueScore({ score, citySlug, tradeSlug, isLoading }: Props) {
  if (isLoading) return <Skeleton className="h-28 w-full rounded-2xl" />;

  const color = score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-muted-foreground";
  const bg = score >= 75 ? "from-emerald-500/10 to-emerald-500/5" : score >= 50 ? "from-amber-500/10 to-amber-500/5" : "from-muted/20 to-muted/10";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-border/30 bg-gradient-to-br ${bg} p-4 space-y-2`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground capitalize">{citySlug} · {tradeSlug}</span>
        </div>
        <TrendingUp className={`h-4 w-4 ${color}`} />
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-3xl font-bold ${color}`}>{score}</span>
        <span className="text-xs text-muted-foreground mb-1">/100</span>
      </div>
      <p className="text-[10px] text-muted-foreground">Zone Value Score</p>
    </motion.div>
  );
}
