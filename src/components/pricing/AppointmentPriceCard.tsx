/**
 * UNPRO — Appointment Price Card (Contractor-facing)
 * Shows why a project is valuable with full price justification.
 */
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, TrendingDown, Minus, Zap, Shield, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PricingResult, PriceJustification } from "@/services/appointmentPricingEngine";
import { formatCents, PLAN_ACCESS } from "@/services/appointmentPricingEngine";

interface Props {
  pricing: PricingResult;
  planTier: string;
  onAccept?: () => void;
  onDecline?: () => void;
}

function JustificationRow({ j, index }: { j: PriceJustification; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.05 }}
      className="flex items-center gap-2.5 text-xs py-1.5"
    >
      {j.impact === "increase" ? (
        <TrendingUp className="w-3.5 h-3.5 text-success flex-shrink-0" />
      ) : j.impact === "decrease" ? (
        <TrendingDown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
      ) : (
        <Minus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      )}
      <span className="text-foreground font-medium flex-1">{j.labelFr}</span>
      <span className={`tabular-nums font-semibold ${
        j.impact === "increase" ? "text-success" : j.impact === "decrease" ? "text-amber-500" : "text-muted-foreground"
      }`}>
        ×{j.multiplier.toFixed(2)}
      </span>
    </motion.div>
  );
}

export default function AppointmentPriceCard({ pricing, planTier, onAccept, onDecline }: Props) {
  const planInfo = PLAN_ACCESS[planTier];

  if (!pricing.canAccess) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 text-center space-y-3">
        <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
        <h3 className="font-display text-sm font-semibold text-foreground">Projet {pricing.projectSize} — non accessible</h3>
        <p className="text-xs text-muted-foreground">
          Votre plan {planTier} ne donne pas accès aux projets de taille {pricing.projectSize}.
          Passez au plan supérieur pour débloquer ces opportunités.
        </p>
        <Button variant="outline" size="sm" className="mt-2">Voir les plans</Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className={`px-5 py-4 border-b border-border/30 ${pricing.isSurge ? "bg-amber-500/5" : ""}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary">
              <DollarSign className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground">Rendez-vous exclusif</h3>
              <p className="text-[11px] text-muted-foreground">Projet {pricing.projectSize} · Aucun partage</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold font-display text-foreground">{formatCents(pricing.finalPriceCents)}</p>
            {pricing.isSurge && (
              <div className="flex items-center gap-1 text-amber-500">
                <Zap className="w-3 h-3" />
                <span className="text-[10px] font-semibold">Forte demande</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-muted/15 border border-border/30 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground/70 mb-0.5">Prix de base</p>
            <p className="text-sm font-bold font-display text-foreground">{formatCents(pricing.basePriceCents)}</p>
          </div>
          <div className="rounded-xl bg-muted/15 border border-border/30 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground/70 mb-0.5">Multiplicateur</p>
            <p className="text-sm font-bold font-display text-foreground">×{pricing.combinedMultiplier}</p>
          </div>
          <div className="rounded-xl bg-muted/15 border border-border/30 p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground/70 mb-0.5">Taille</p>
            <p className="text-sm font-bold font-display text-foreground">{pricing.projectSize}</p>
          </div>
        </div>

        {/* Justifications */}
        <div>
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium mb-2">
            Pourquoi ce prix
          </p>
          <div className="divide-y divide-border/20">
            {pricing.justifications.map((j, i) => (
              <JustificationRow key={j.factor} j={j} index={i} />
            ))}
          </div>
        </div>

        {/* Surge banner */}
        {pricing.surgeReason && (
          <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 flex items-start gap-2">
            <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/80">{pricing.surgeReason}</p>
          </div>
        )}

        {/* Guarantee */}
        <div className="rounded-xl bg-success/5 border border-success/20 p-3 flex items-start gap-2">
          <Shield className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-success">Rendez-vous garanti & exclusif</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Ce rendez-vous vous est réservé. Aucun autre entrepreneur ne le recevra. Crédit automatique en cas d'erreur de matching.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      {(onAccept || onDecline) && (
        <div className="px-5 py-4 border-t border-border/30 flex gap-2">
          {onAccept && (
            <Button onClick={onAccept} className="flex-1 h-11 bg-primary hover:bg-primary/90 font-semibold text-sm">
              Accepter · {formatCents(pricing.finalPriceCents)}
            </Button>
          )}
          {onDecline && (
            <Button onClick={onDecline} variant="outline" className="h-11 border-border/40 text-sm">
              Refuser
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}
