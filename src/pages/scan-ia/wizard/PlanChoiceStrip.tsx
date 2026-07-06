/**
 * PlanChoiceStrip — horizontal scrollable strip of contractor plans with
 * upsell (Élite/Signature) and downgrade (Recrue/Pro) affordances.
 * Renders inside the white activation card on StepActivate.
 */
import { CONTRACTOR_PLANS, type ContractorPlanSlug } from "@/config/contractorPlans";
import { fmtCADDollars } from "@/features/scanIA/planPricingBreakdown";
import { Check, ArrowUp, ArrowDown } from "lucide-react";

const ORDER: ContractorPlanSlug[] = ["recrue", "pro", "premium", "elite", "signature"];

interface Props {
  recommended: ContractorPlanSlug;
  selected: ContractorPlanSlug;
  onSelect: (slug: ContractorPlanSlug) => void;
}

export default function PlanChoiceStrip({ recommended, selected, onSelect }: Props) {
  const recIndex = ORDER.indexOf(recommended);

  return (
    <div className="mb-5 -mx-6">
      <div className="px-6 mb-2 flex items-baseline justify-between">
        <div className="text-[10px] uppercase tracking-widest text-black/40">
          Ajuster le plan
        </div>
        <div className="text-[10px] text-black/40">Glisser →</div>
      </div>
      <div className="overflow-x-auto snap-x snap-mandatory scrollbar-none">
        <div className="flex gap-2 px-6 pb-1">
          {ORDER.map((slug) => {
            const plan = CONTRACTOR_PLANS.find((p) => p.slug === slug);
            if (!plan) return null;
            const i = ORDER.indexOf(slug);
            const isSelected = slug === selected;
            const isRecommended = slug === recommended;
            const isUpsell = i > recIndex;
            const isDowngrade = i < recIndex;

            return (
              <button
                key={slug}
                type="button"
                onClick={() => {
                  onSelect(slug);
                  if ("vibrate" in navigator) navigator.vibrate?.(8);
                }}
                className={[
                  "snap-start shrink-0 w-[128px] rounded-2xl p-3 text-left transition-all border",
                  isSelected
                    ? "bg-white border-amber-400 shadow-[0_4px_16px_rgba(251,191,36,0.25)] ring-2 ring-amber-400/60"
                    : isRecommended
                    ? "bg-amber-50/60 border-amber-300"
                    : "bg-black/[0.03] border-black/5",
                ].join(" ")}
              >
                <div className="flex items-center justify-between mb-1.5 h-4">
                  {isRecommended && (
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-amber-600">
                      Recommandé
                    </span>
                  )}
                  {!isRecommended && isUpsell && (
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-emerald-700 flex items-center gap-0.5">
                      <ArrowUp className="h-2.5 w-2.5" /> Capacité
                    </span>
                  )}
                  {!isRecommended && isDowngrade && (
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-black/40 flex items-center gap-0.5">
                      <ArrowDown className="h-2.5 w-2.5" /> Économiser
                    </span>
                  )}
                  {isSelected && <Check className="h-3.5 w-3.5 text-amber-600 ml-auto" />}
                </div>
                <div className="text-sm font-semibold text-black/90 mb-0.5">{plan.name}</div>
                <div className="text-base font-bold text-black">
                  {fmtCADDollars(plan.monthlyPrice)}
                  <span className="text-[10px] font-normal text-black/40"> /mois</span>
                </div>
                {plan.appointmentsIncluded > 0 && (
                  <div className="text-[10px] text-black/50 mt-1">
                    {plan.appointmentsIncluded} RDV inclus
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
