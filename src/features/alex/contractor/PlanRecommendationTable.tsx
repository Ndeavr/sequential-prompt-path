/**
 * PlanRecommendationTable — 5 plans with the recommended one highlighted.
 */
import { Sparkles, Check } from "lucide-react";
import { useAlexVisualStore } from "../visual/visualStore";
import { useContractorStore } from "./contractorStore";

const PLANS = [
  { code: "recrue", label: "Recrue", price: 149, appts: 1 },
  { code: "pro", label: "Pro", price: 349, appts: 5 },
  { code: "premium", label: "Premium", price: 599, appts: 10 },
  { code: "elite", label: "Élite", price: 999, appts: 25 },
  { code: "signature", label: "Signature", price: 1799, appts: 50 },
] as const;

interface Props {
  actionId: string;
}

export default function PlanRecommendationTable({ actionId }: Props) {
  const plan = useContractorStore((s) => s.plan);
  const pushAction = useAlexVisualStore((s) => s.pushAction);
  const recommended = plan?.recommended_plan?.toLowerCase() || "premium";

  function choose(code: string) {
    pushAction({
      id: `checkout-${Date.now()}`,
      type: "contractor_checkout",
      payload: { plan_code: code },
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Plan recommandé</p>
      </div>
      {plan?.reason && (
        <p className="text-xs text-muted-foreground italic">"{plan.reason}"</p>
      )}

      <div className="space-y-1.5">
        {PLANS.map((p) => {
          const isReco = p.code === recommended;
          return (
            <button
              key={p.code}
              onClick={() => choose(p.code)}
              className={`w-full text-left rounded-xl border px-3 py-2.5 transition active:scale-[0.99] ${
                isReco
                  ? "border-primary bg-primary/10 shadow-[0_0_20px_-8px_hsl(var(--primary))]"
                  : "border-border bg-background/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isReco && <Check className="w-3.5 h-3.5 text-primary" />}
                  <span className="text-sm font-medium text-foreground">{p.label}</span>
                  {isReco && (
                    <span className="text-[10px] uppercase tracking-wide text-primary font-semibold">
                      Recommandé
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-foreground">{p.price}$<span className="text-xs text-muted-foreground">/mois</span></div>
                  <div className="text-[10px] text-muted-foreground">{p.appts} rdv/mois</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
