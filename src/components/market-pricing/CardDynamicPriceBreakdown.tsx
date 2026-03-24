/**
 * UNPRO — Dynamic Price Breakdown Card
 */
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, TrendingDown, Minus, ShieldCheck, AlertTriangle } from "lucide-react";

interface Props {
  price: any;
  index: number;
}

export default function CardDynamicPriceBreakdown({ price, index }: Props) {
  const justifications: any[] = Array.isArray(price.justification_json) ? price.justification_json : [];
  const finalDisplay = `${(price.final_price_cents / 100).toFixed(2)} $`;
  const baseDisplay = `${(price.base_price_cents / 100).toFixed(2)} $`;
  const cplDisplay = `${(price.base_cpl_cents / 100).toFixed(2)} $`;

  const impactIcon = (impact: string) => {
    if (impact === "increase") return <TrendingUp className="h-3 w-3 text-orange-400" />;
    if (impact === "decrease") return <TrendingDown className="h-3 w-3 text-emerald-400" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-2xl border border-border/30 bg-card/60 p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground capitalize">
            {price.trade_slug} · {price.city_slug}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {price.fallback_used && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 text-[10px] font-semibold">
              <AlertTriangle className="h-3 w-3" /> Fallback
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">
            {price.confidence_score}% confiance
          </span>
        </div>
      </div>

      {/* Price summary */}
      <div className="flex items-end gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Google CPL</p>
          <p className="text-sm font-medium text-foreground">{cplDisplay}</p>
        </div>
        <div className="text-muted-foreground text-xs">→</div>
        <div>
          <p className="text-xs text-muted-foreground">Base (+{price.unpro_markup_percent}%)</p>
          <p className="text-sm font-medium text-foreground">{baseDisplay}</p>
        </div>
        <div className="text-muted-foreground text-xs">→</div>
        <div>
          <p className="text-xs text-muted-foreground">×{price.combined_multiplier}</p>
          <p className="text-lg font-bold text-primary">{finalDisplay}</p>
        </div>
      </div>

      {/* Multiplier breakdown */}
      {justifications.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-border/20">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Justification</p>
          {justifications.map((j: any) => (
            <div key={j.factor} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                {impactIcon(j.impact)}
                <span className="text-muted-foreground">{j.label_fr}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground/70 text-[10px]">{j.reason}</span>
                <span className={`font-mono font-semibold ${j.multiplier > 1.05 ? "text-orange-400" : j.multiplier < 0.95 ? "text-emerald-400" : "text-muted-foreground"}`}>
                  ×{j.multiplier}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Guardrails */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 pt-1">
        <ShieldCheck className="h-3 w-3" />
        <span>Min {(price.minimum_price_cents / 100).toFixed(0)}$ · Max {(price.maximum_price_cents / 100).toFixed(0)}$</span>
        {price.valid_until && (
          <span className="ml-auto">Valide jusqu'au {new Date(price.valid_until).toLocaleDateString("fr-CA")}</span>
        )}
      </div>
    </motion.div>
  );
}
