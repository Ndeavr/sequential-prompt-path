/**
 * UNPRO — Demand Heatmap Live Widget
 */
import { motion } from "framer-motion";
import { Flame, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  signals: any[];
  isLoading: boolean;
}

const HEAT_COLORS = [
  { min: 0, max: 30, bg: "bg-blue-500/20", text: "text-blue-400", label: "Faible" },
  { min: 30, max: 50, bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Normal" },
  { min: 50, max: 70, bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Élevé" },
  { min: 70, max: 85, bg: "bg-orange-500/20", text: "text-orange-400", label: "Fort" },
  { min: 85, max: 101, bg: "bg-red-500/20", text: "text-red-400", label: "Surge" },
];

function getHeat(score: number) {
  return HEAT_COLORS.find(h => score >= h.min && score < h.max) || HEAT_COLORS[1];
}

export default function WidgetDemandHeatmapLive({ signals, isLoading }: Props) {
  if (isLoading) {
    return <Skeleton className="h-32 w-full rounded-2xl" />;
  }

  // Deduplicate, keep latest per city+trade
  const latest = new Map<string, any>();
  signals.forEach(s => {
    const key = `${s.city_slug}__${s.trade_slug}`;
    if (!latest.has(key)) latest.set(key, s);
  });
  const items = Array.from(latest.values())
    .sort((a, b) => (b.demand_score || 0) - (a.demand_score || 0))
    .slice(0, 20);

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-border/30 bg-card/40 p-6 text-center">
        <Flame className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Aucune donnée de demande disponible.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Flame className="h-4 w-4 text-orange-400" />
        Heatmap de demande en direct
      </h2>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => {
          const heat = getHeat(item.demand_score || 0);
          return (
            <motion.div
              key={`${item.city_slug}-${item.trade_slug}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              className={`rounded-xl ${heat.bg} px-3 py-2 flex items-center gap-2 border border-border/10`}
            >
              <MapPin className={`h-3 w-3 ${heat.text}`} />
              <div>
                <p className="text-xs font-semibold text-foreground capitalize">{item.city_slug}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{item.trade_slug}</p>
              </div>
              <div className="text-right ml-2">
                <p className={`text-sm font-bold ${heat.text}`}>{item.demand_score}</p>
                <p className={`text-[9px] font-medium ${heat.text}`}>{heat.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex gap-3 mt-3">
        {HEAT_COLORS.map(h => (
          <div key={h.label} className="flex items-center gap-1">
            <div className={`h-2.5 w-2.5 rounded-full ${h.bg} border border-border/20`} />
            <span className="text-[9px] text-muted-foreground">{h.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
