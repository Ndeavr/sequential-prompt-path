import WizardShell from "./WizardShell";
import { useScanWizardState } from "./useScanWizardState";
import { GOAL_LABELS, type BusinessGoal } from "@/features/scanIA/growthPlanEngine";

const GOALS: BusinessGoal[] = [
  "grow_revenue",
  "fill_schedule",
  "increase_profit",
  "expand_territory",
  "become_leader",
  "recruit_team",
];

export default function Step6Goal() {
  const { goal, setGoal } = useScanWizardState();

  return (
    <WizardShell canAdvance={Boolean(goal)}>
      <div className="flex-1 flex flex-col">
        <div className="text-center mb-6">
          <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-2">
            Objectif principal
          </div>
          <h1 className="text-2xl font-semibold text-white">Que voulez-vous accomplir</h1>
        </div>

        <div className="grid grid-cols-1 gap-3 max-w-md w-full mx-auto">
          {GOALS.map((g) => {
            const label = GOAL_LABELS[g];
            const active = goal === g;
            return (
              <button
                key={g}
                onClick={() => setGoal(g)}
                className={`text-left p-4 rounded-2xl border transition-all duration-300 ${
                  active
                    ? "bg-amber-400/10 border-amber-400/60 shadow-[0_0_0_1px_rgba(251,191,36,0.4)]"
                    : "bg-white/[0.03] border-white/10 hover:border-white/20 active:scale-[0.99]"
                }`}
              >
                <div className={`font-semibold text-base ${active ? "text-amber-300" : "text-white"}`}>
                  {label.title}
                </div>
                <div className="text-white/50 text-xs mt-0.5">{label.hint}</div>
              </button>
            );
          })}
        </div>
      </div>
    </WizardShell>
  );
}
