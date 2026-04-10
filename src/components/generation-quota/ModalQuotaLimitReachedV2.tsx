/**
 * ModalQuotaLimitReachedV2 — Premium modal when user exhausts generation credits.
 * Shows plan comparison and upgrade CTA.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, ArrowRight, Infinity } from "lucide-react";
import type { GenerationQuota } from "@/hooks/useGenerationQuota";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quota: GenerationQuota;
  onUpgrade?: (plan: string) => void;
}

export default function ModalQuotaLimitReachedV2({ open, onOpenChange, quota, onUpgrade }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Générations épuisées
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vous avez utilisé vos <strong>{quota.maxGenerations} générations</strong> incluses dans votre plan {quota.planType === "decouverte" ? "Découverte" : "Plus"}.
          </p>

          {/* Plan comparison */}
          <CardPlanComparisonUsageV2 currentPlan={quota.planType} onUpgrade={onUpgrade} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Plan comparison card ───

function CardPlanComparisonUsageV2({ currentPlan, onUpgrade }: { currentPlan: string; onUpgrade?: (plan: string) => void }) {
  const plans = [
    { key: "decouverte", label: "Découverte", generations: "3", price: "Gratuit", features: ["3 générations visuelles", "Peinture + rénovation", "Partage par lien"] },
    { key: "plus", label: "Plus", generations: "5", price: "À partir de 29$/mois", features: ["5 générations visuelles", "Peinture + rénovation", "Sauvegarde projets", "Historique complet"] },
    { key: "signature", label: "Signature", generations: "∞", price: "À partir de 79$/mois", features: ["Générations illimitées", "Tous les modules", "Support prioritaire", "API accès"] },
  ];

  return (
    <div className="space-y-2">
      {plans.map((plan) => {
        const isCurrent = plan.key === currentPlan;
        const isUpgrade = plans.findIndex(p => p.key === plan.key) > plans.findIndex(p => p.key === currentPlan);

        return (
          <div
            key={plan.key}
            className={`rounded-xl border p-3 transition-all ${
              isCurrent ? "border-primary/30 bg-primary/5" 
              : isUpgrade ? "border-border/40 hover:border-primary/30 cursor-pointer" 
              : "border-border/20 opacity-50"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{plan.label}</span>
                {plan.key === "signature" && <Infinity className="w-3.5 h-3.5 text-amber-500" />}
                {isCurrent && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                    Actuel
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{plan.price}</span>
            </div>

            <div className="space-y-1">
              {plan.features.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Check className="w-3 h-3 text-primary flex-shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            {isUpgrade && (
              <Button
                size="sm"
                className="w-full mt-2 rounded-full gap-1.5 text-xs"
                onClick={() => onUpgrade?.(plan.key)}
              >
                Passer à {plan.label} <ArrowRight className="w-3 h-3" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export { CardPlanComparisonUsageV2 };
