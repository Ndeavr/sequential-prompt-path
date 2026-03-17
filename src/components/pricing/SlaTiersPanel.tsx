/**
 * UNPRO — SLA Tiers Panel (Admin)
 */
import { motion } from "framer-motion";
import { Clock, Shield } from "lucide-react";
import { useSlaTiers } from "@/hooks/useDynamicPricing";

export default function SlaTiersPanel() {
  const { data: tiers, isLoading } = useSlaTiers();

  const tierColors: Record<string, string> = {
    standard: "bg-muted/20 border-border/30",
    fast: "bg-primary/5 border-primary/20",
    priority: "bg-warning/5 border-warning/20",
    ultra: "bg-destructive/5 border-destructive/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4 text-primary" />
        <h2 className="font-display text-sm font-semibold text-foreground">Niveaux SLA</h2>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Chargement…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(tiers ?? []).map((t: any) => (
            <div
              key={t.id}
              className={`rounded-xl border p-4 space-y-2 ${tierColors[t.tier_key] ?? tierColors.standard}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">{t.name_fr}</p>
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <p className="text-[10px] text-muted-foreground">{t.description_fr}</p>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-[10px] text-muted-foreground/70">Temps réponse</p>
                  <p className="text-sm font-bold font-display text-foreground">
                    {t.response_time_minutes} min
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground/70">Multiplicateur</p>
                  <p className="text-sm font-bold font-display text-primary">
                    ×{t.price_multiplier}
                  </p>
                </div>
              </div>
              {t.dispatch_priority_boost > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Boost priorité: +{t.dispatch_priority_boost}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
