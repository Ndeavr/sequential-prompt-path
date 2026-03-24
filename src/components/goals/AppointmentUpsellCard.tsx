import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarPlus, Check, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculatePackPricing, formatCents, type PackTier } from "@/lib/appointmentPricing";

interface Props {
  monthlyAppointments?: number;
  planIncludedRdv?: number;
  tradeSlug?: string;
  citySlug?: string;
  selectedPack: PackTier | null;
  onSelectPack: (pack: PackTier | null) => void;
}

export default function AppointmentUpsellCard({
  monthlyAppointments = 0,
  planIncludedRdv = 0,
  tradeSlug = "default",
  citySlug = "",
  selectedPack,
  onSelectPack,
}: Props) {
  const pricing = calculatePackPricing(tradeSlug, citySlug);
  const gap = Math.max(0, monthlyAppointments - planIncludedRdv);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
            <CalendarPlus className="w-4 h-4 text-secondary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Besoin de plus de rendez-vous?</p>
            {gap > 0 && (
              <p className="text-xs text-muted-foreground">
                +{gap} RDV/mois recommandés pour atteindre vos objectifs
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Pack tiers */}
      <div className="px-4 pb-4 space-y-2">
        {pricing.tiers.map((tier) => {
          const isSelected = selectedPack?.size === tier.size;
          return (
            <button
              key={tier.size}
              onClick={() => onSelectPack(isSelected ? null : tier)}
              className={cn(
                "w-full flex items-center justify-between rounded-xl p-3 border transition-all text-left",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border/50 bg-background hover:border-primary/30"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                  isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                )}>
                  {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{tier.size} rendez-vous</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCents(tier.unitPriceCents)}/RDV
                    {tier.savingsPercent > 0 && (
                      <span className="ml-1 text-green-600 font-semibold">-{tier.savingsPercent}%</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{formatCents(tier.totalPriceCents)}</p>
              </div>
            </button>
          );
        })}

        {/* Value callout */}
        <div className="flex items-center gap-2 pt-1 px-1">
          <TrendingUp className="w-3.5 h-3.5 text-green-500 shrink-0" />
          <p className="text-[10px] text-muted-foreground">
            Prix basé sur la valeur moyenne des contrats dans votre domaine et votre zone
          </p>
        </div>
      </div>
    </motion.div>
  );
}
