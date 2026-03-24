/**
 * UNPRO — Market Control Panel (dynamic prices overview)
 */
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, Shield, AlertTriangle } from "lucide-react";

interface Props {
  prices: any[];
  isLoading: boolean;
}

export default function AdminMarketControlPanel({ prices, isLoading }: Props) {
  if (isLoading) return <Skeleton className="h-44 w-full rounded-2xl" />;

  const total = prices.length;
  const avgPrice = total
    ? Math.round(prices.reduce((s, p) => s + (p.final_price_cents || 0), 0) / total)
    : 0;
  const surgeCount = prices.filter(p => (p.combined_multiplier || 1) > 1.3).length;
  const fallbackCount = prices.filter(p => p.fallback_used).length;

  const items = [
    { label: "Prix actifs", value: total, icon: DollarSign },
    { label: "Prix moyen", value: `${(avgPrice / 100).toFixed(0)} $`, icon: TrendingUp },
    { label: "Surge actifs", value: surgeCount, icon: Shield },
    { label: "Fallback", value: fallbackCount, icon: AlertTriangle },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/30 bg-card/60 p-4 space-y-3"
    >
      <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
        <DollarSign className="h-3.5 w-3.5 text-primary" />
        Contrôle prix dynamiques
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-2">
            <item.icon className="h-4 w-4 mt-0.5 text-primary" />
            <div>
              <p className="text-sm font-bold text-foreground">{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Top 3 highest prices */}
      {prices.length > 0 && (
        <div className="pt-2 border-t border-border/20 space-y-1">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Top prix</p>
          {prices
            .sort((a, b) => (b.final_price_cents || 0) - (a.final_price_cents || 0))
            .slice(0, 3)
            .map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground capitalize">{p.trade_slug} · {p.city_slug}</span>
                <span className="text-primary font-semibold">{(p.final_price_cents / 100).toFixed(0)} $</span>
              </div>
            ))}
        </div>
      )}
    </motion.div>
  );
}
