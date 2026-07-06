import { useMemo } from "react";
import WizardShell from "./WizardShell";
import { useScanWizardState } from "./useScanWizardState";
import { ArrowDown, Sparkles } from "lucide-react";
import { pickRecommendedPlan, buildGrowthPlan, type BusinessGoal } from "@/features/scanIA/growthPlanEngine";
import { CONTRACTOR_PLANS } from "@/config/contractorPlans";
import { fmtCADDollars } from "@/features/scanIA/planPricingBreakdown";

export default function Step10Projection() {
  const { report, capacity, goal, selectedPlan, next } = useScanWizardState();

  // Real baseline: what the pro declared (or 4 if truly unknown — never 1)
  const today = Math.max(1, report?.today_jobs_per_month ?? 4);

  const opp = Number(report?.opportunities?.estimated_revenue ?? 0);
  const recs = useMemo(
    () => (report ? buildGrowthPlan(report as any, (goal ?? "grow_revenue") as BusinessGoal, capacity) : []),
    [report, goal, capacity],
  );
  const totalPlan = recs.reduce((s, r) => s + r.annual_value_cad, 0);
  const recommendedSlug = pickRecommendedPlan(Math.max(opp, totalPlan));
  const activeSlug = selectedPlan ?? recommendedSlug;
  const plan = CONTRACTOR_PLANS.find((p) => p.slug === activeSlug);

  // Real numbers, all capped:
  // - can't exceed real waiting homeowners
  // - can't exceed what the pro said they can absorb
  // - can't exceed what the plan actually delivers (RDV inclus)
  const topCity = report?.territory_demand?.[0];
  const topCityDemand = Math.max(0, Number(topCity?.waiting_homeowners ?? 0));
  const planCap = plan?.appointmentsIncluded ?? capacity;
  const additional = Math.min(capacity, topCityDemand || capacity, planCap);
  const projected = today + additional;

  const max = Math.max(today, projected, 1);
  const todayW = (today / max) * 100;
  const projW = (projected / max) * 100;
  const todayNarrow = todayW < 18;

  return (
    <WizardShell primaryLabel="Activer mon profil">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="text-center text-xs uppercase tracking-[0.3em] text-white/50 mb-2">
            Aujourd'hui
          </div>
          <div className="mb-2 h-14 rounded-xl bg-white/10 overflow-hidden flex items-center">
            <div
              className="h-full bg-white/40 flex items-center justify-end pr-3 min-w-[44px] rounded-l-xl"
              style={{ width: `${todayW}%`, transition: "width 700ms cubic-bezier(0.22,1,0.36,1)" }}
            >
              {!todayNarrow && (
                <span className="text-white font-semibold">{today}</span>
              )}
            </div>
            {todayNarrow && (
              <span className="text-white font-semibold ml-3">{today}</span>
            )}
          </div>
          <div className="text-white/50 text-sm text-center mb-8">projets / mois (déclaré)</div>

          <div className="flex justify-center mb-6">
            <ArrowDown className="h-6 w-6 text-amber-400 animate-bounce" />
          </div>

          <div className="text-center text-xs uppercase tracking-[0.3em] text-emerald-300 mb-2">
            Avec UNPRO
          </div>
          <div className="mb-2 h-14 rounded-xl bg-emerald-500/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 flex items-center justify-end pr-4 text-white font-semibold min-w-[44px]"
              style={{ width: `${projW}%`, transition: "width 900ms 300ms cubic-bezier(0.22,1,0.36,1)" }}
            >
              {projected}
            </div>
          </div>
          <div className="text-emerald-400 text-sm text-center font-medium mb-2">
            +{additional} rendez-vous IA / mois
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/50 mb-6">
            <Sparkles className="h-3 w-3 text-amber-300" />
            <span>
              Estimation IA
              {topCity?.city ? ` · ${topCity.city}` : ""}
              {plan ? ` · plan ${plan.name} (${plan.appointmentsIncluded} RDV inclus)` : ""}
            </span>
          </div>
          {topCityDemand > 0 && (
            <div className="text-center text-[11px] text-white/40 mb-6 -mt-4">
              {topCityDemand} propriétaires en attente · {additional} captables ce mois
            </div>
          )}

          {plan && (
            <button
              type="button"
              onClick={next}
              className="mx-auto flex items-center justify-between gap-3 w-full max-w-[280px] rounded-2xl bg-white/[0.06] border border-white/10 px-4 py-3 text-left active:scale-[0.99] transition"
            >
              <div>
                <div className="text-[10px] uppercase tracking-widest text-amber-300 mb-0.5">
                  {selectedPlan && selectedPlan !== recommendedSlug ? "Plan choisi" : "Plan recommandé"}
                </div>
                <div className="text-white font-semibold text-sm">{plan.name}</div>
              </div>
              <div className="text-right">
                <div className="text-white font-semibold text-sm">1&nbsp;$ aujourd'hui</div>
                <div className="text-white/50 text-[10px]">puis {fmtCADDollars(plan.monthlyPrice)}/mois</div>
              </div>
            </button>
          )}
        </div>
      </div>
    </WizardShell>
  );
}
