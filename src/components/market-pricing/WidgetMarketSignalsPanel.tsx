/**
 * UNPRO — Market Signals Panel
 */
import { motion } from "framer-motion";
import { Activity, Users, FileText, Snowflake, Sun } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  signals: any[];
  isLoading: boolean;
}

export default function WidgetMarketSignalsPanel({ signals, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!signals.length) {
    return (
      <div className="rounded-2xl border border-border/30 bg-card/40 p-6 text-center">
        <Activity className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Aucun signal marché disponible.</p>
        <p className="text-xs text-muted-foreground mt-1">Lancez un rafraîchissement pour générer les signaux.</p>
      </div>
    );
  }

  // Deduplicate by city+trade, keep latest
  const latest = new Map<string, any>();
  signals.forEach(s => {
    const key = `${s.city_slug}__${s.trade_slug}`;
    if (!latest.has(key)) latest.set(key, s);
  });
  const unique = Array.from(latest.values()).slice(0, 12);

  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground mb-3">Signaux marché récents</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {unique.map((sig, i) => {
          const seasonIcon = sig.seasonality_index > 1.1 ? Sun : Snowflake;
          const SeasonIcon = seasonIcon;
          return (
            <motion.div
              key={sig.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl border border-border/20 bg-card/40 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground capitalize">{sig.trade_slug} · {sig.city_slug}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(sig.snapshot_at).toLocaleDateString("fr-CA")}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">{sig.demand_score}</p>
                  <p className="text-[10px] text-muted-foreground">Demande</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{sig.supply_score}</p>
                  <p className="text-[10px] text-muted-foreground">Offre</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">×{sig.seasonality_index}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                    <SeasonIcon className="h-3 w-3" /> Saison
                  </p>
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground/60">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {sig.active_contractors} entrepreneurs</span>
                <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {sig.active_leads} leads</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
