/**
 * UNPRO — Lead Priority Meter Widget
 */
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Target } from "lucide-react";

interface Props {
  leads: any[];
  isLoading: boolean;
}

const BUCKETS = [
  { label: "Critique (P1)", min: 4, color: "bg-red-500" },
  { label: "Élevée (P2)", min: 3, color: "bg-orange-500" },
  { label: "Normale (P3)", min: 2, color: "bg-yellow-500" },
  { label: "Basse (P4)", min: 0, color: "bg-blue-500" },
];

export default function WidgetLeadPriorityMeter({ leads, isLoading }: Props) {
  if (isLoading) return <Skeleton className="h-36 w-full rounded-2xl" />;

  const counts = BUCKETS.map(b => ({
    ...b,
    count: leads.filter((l: any) => {
      const p = l.pred?.predicted_routing_priority || 0;
      const nextBucket = BUCKETS.find(bb => bb.min > b.min);
      return p >= b.min && (!nextBucket || p < nextBucket.min);
    }).length,
  })).reverse();

  const max = Math.max(...counts.map(c => c.count), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/30 bg-card/60 p-4 space-y-3"
    >
      <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
        <Target className="h-3.5 w-3.5 text-primary" />
        Répartition des priorités
      </h3>
      <div className="space-y-2">
        {counts.map((bucket) => (
          <div key={bucket.label} className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-20 shrink-0">{bucket.label}</span>
            <div className="flex-1 h-4 rounded-full bg-muted/30 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(bucket.count / max) * 100}%` }}
                transition={{ duration: 0.5 }}
                className={`h-full rounded-full ${bucket.color}/60`}
              />
            </div>
            <span className="text-xs font-bold text-foreground w-8 text-right">{bucket.count}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
