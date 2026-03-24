/**
 * UNPRO — Routing Confidence Widget
 */
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield } from "lucide-react";

interface Props {
  leads: any[];
  isLoading: boolean;
}

const TIERS = [
  { label: "Très haute (≥80%)", min: 80, color: "bg-emerald-500" },
  { label: "Haute (60-79%)", min: 60, color: "bg-blue-500" },
  { label: "Moyenne (40-59%)", min: 40, color: "bg-yellow-500" },
  { label: "Basse (<40%)", min: 0, color: "bg-red-500" },
];

export default function WidgetRoutingConfidence({ leads, isLoading }: Props) {
  if (isLoading) return <Skeleton className="h-36 w-full rounded-2xl" />;

  const withPred = leads.filter((l: any) => l.pred);
  const total = withPred.length || 1;

  const tiers = TIERS.map((t, idx) => {
    const nextMin = TIERS[idx - 1]?.min ?? 101;
    return {
      ...t,
      count: withPred.filter((l: any) => {
        const c = l.pred?.confidence_score || 0;
        return c >= t.min && c < nextMin;
      }).length,
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/30 bg-card/60 p-4 space-y-3"
    >
      <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
        <Shield className="h-3.5 w-3.5 text-primary" />
        Confiance du routing
      </h3>
      <div className="flex gap-2 h-20 items-end">
        {tiers.map((tier) => {
          const pct = Math.max(5, (tier.count / total) * 100);
          return (
            <div key={tier.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-foreground">{tier.count}</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={{ duration: 0.5 }}
                className={`w-full rounded-t-lg ${tier.color}/50`}
              />
              <span className="text-[8px] text-muted-foreground text-center leading-tight">{tier.label}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
