import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarPlus, Check, TrendingUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  calculatePackPricing,
  type PackTier,
} from "@/lib/appointmentPricing";
import { formatPrice, formatPricePerRdv } from "@/lib/formatPrice";

interface Props {
  monthlyAppointments?: number;
  planIncludedRdv?: number;
  tradeSlug?: string;
  citySlug?: string;
  selectedPack: PackTier | null;
  onSelectPack: (pack: PackTier | null) => void;
}

const REVEAL_STEPS = [
  "Analyse du marché local…",
  "Calcul du potentiel de revenus…",
  "Optimisation du coût d'acquisition…",
];

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

  // Reveal animation: 3 steps, ~350 ms each, then show prices.
  const [revealStep, setRevealStep] = useState(0);
  const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduceMotion) {
      setRevealStep(REVEAL_STEPS.length);
      return;
    }
    let i = 0;
    const tick = () => {
      i += 1;
      setRevealStep(i);
      if (i < REVEAL_STEPS.length) timer = window.setTimeout(tick, 380);
    };
    let timer = window.setTimeout(tick, 380);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, tradeSlug, citySlug]);

  const revealed = revealStep >= REVEAL_STEPS.length;

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
            <p className="text-sm font-bold text-foreground">Besoin de plus de rendez-vous qualifiés ?</p>
            {gap > 0 && (
              <p className="text-xs text-muted-foreground">
                +{gap} RDV/mois recommandés pour atteindre vos objectifs
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Reveal stepper */}
      <AnimatePresence>
        {!revealed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-4 space-y-1.5"
          >
            {REVEAL_STEPS.slice(0, revealStep + 1).map((label, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                {i < revealStep ? (
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse shrink-0" />
                )}
                <span>{label}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pack tiers */}
      {revealed && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="px-4 pb-4 space-y-2"
        >
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
                    <p className="text-sm font-semibold text-foreground">{tier.size} rendez-vous qualifiés</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPricePerRdv(tier.unitPrice)}
                      {tier.savingsPercent > 0 && (
                        <span className="ml-1 text-success font-semibold">-{tier.savingsPercent}%</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{formatPrice(tier.totalPrice)}</p>
                </div>
              </button>
            );
          })}

          {/* ROI projection for selected tier */}
          {selectedPack && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-primary/20 bg-primary/5 p-3 mt-2"
            >
              <p className="text-[11px] uppercase tracking-wider font-bold text-primary mb-1">
                Projection de revenus
              </p>
              <p className="text-sm text-foreground">
                <strong>{selectedPack.size} rendez-vous</strong> · ≈ {selectedPack.estimatedClosedDeals} contrats signés ·{" "}
                <strong className="text-success">≈ {formatPrice(selectedPack.estimatedRevenue)} de revenus potentiels</strong>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                1 contrat peut rentabiliser plusieurs mois de votre forfait.
              </p>
            </motion.div>
          )}

          {/* Credibility footer */}
          <div className="flex items-start gap-2 pt-2 px-1">
            <TrendingUp className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Calculé selon votre industrie (<strong className="text-foreground">{pricing.industry.name}</strong>),
              votre région (<strong className="text-foreground">{pricing.territory.name}</strong>) et la valeur moyenne
              des contrats (<strong className="text-foreground">≈ {formatPrice(pricing.avgContractValue)}</strong>).
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
