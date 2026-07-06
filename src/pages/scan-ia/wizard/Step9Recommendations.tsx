import WizardShell from "./WizardShell";
import { useScanWizardState } from "./useScanWizardState";
import { buildGrowthPlan, type BusinessGoal } from "@/features/scanIA/growthPlanEngine";
import { fmtCAD } from "./useCountUp";
import { Sparkles } from "lucide-react";

const ACCENT: Record<string, string> = {
  emerald: "border-emerald-400/40 bg-emerald-500/[0.06]",
  sky: "border-sky-400/40 bg-sky-500/[0.06]",
  amber: "border-amber-400/40 bg-amber-500/[0.06]",
};
const ACCENT_TEXT: Record<string, string> = {
  emerald: "text-emerald-400",
  sky: "text-sky-400",
  amber: "text-amber-400",
};

export default function Step9Recommendations() {
  const { report, goal, capacity } = useScanWizardState();
  if (!report) return null;
  const recs = buildGrowthPlan(report as any, (goal ?? "grow_revenue") as BusinessGoal, capacity);

  return (
    <WizardShell primaryLabel="Voir ma projection">
      <div className="flex-1 flex flex-col">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 text-sky-300 text-xs mb-2">
            <Sparkles className="h-3.5 w-3.5" /> RECOMMANDATION D'ALEX
          </div>
          <h1 className="text-2xl font-semibold text-white">Votre plan de croissance</h1>
        </div>

        <div className="space-y-3 max-w-md w-full mx-auto">
          {recs.map((r, i) => (
            <div
              key={r.rank}
              className={`p-4 rounded-2xl border ${ACCENT[r.accent] ?? ACCENT.emerald} backdrop-blur`}
              style={{ animation: `slideUp 500ms ${i * 140}ms both cubic-bezier(0.22,1,0.36,1)` }}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`h-8 w-8 flex-shrink-0 rounded-full border ${ACCENT[r.accent]} flex items-center justify-center text-sm font-semibold ${ACCENT_TEXT[r.accent]}`}
                >
                  {r.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-base leading-snug">{r.title}</div>
                  <div className="text-white/50 text-xs mt-0.5">{r.detail}</div>
                </div>
                <div className={`${ACCENT_TEXT[r.accent]} font-semibold text-sm whitespace-nowrap`}>
                  +{fmtCAD(r.annual_value_cad)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </WizardShell>
  );
}
