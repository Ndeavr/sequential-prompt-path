import WizardShell from "./WizardShell";
import { useScanWizardState } from "./useScanWizardState";
import { Flame } from "lucide-react";

const HEAT_COLOR = {
  high: "text-red-400",
  growing: "text-amber-400",
  emerging: "text-sky-400",
} as const;

const HEAT_LABEL = {
  high: "Demande élevée",
  growing: "En croissance",
  emerging: "Émergent",
} as const;

export default function Step5Territory() {
  const { report } = useScanWizardState();
  const rows = (report?.territory_demand ?? []) as Array<{
    city: string;
    waiting_homeowners: number;
    heat_level: "high" | "growing" | "emerging";
  }>;

  return (
    <WizardShell primaryLabel="Choisir mon objectif">
      <div className="flex-1 flex flex-col justify-center">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-2">
            Demande active
          </div>
          <h1 className="text-2xl font-semibold text-white">
            Où sont vos prochains clients
          </h1>
        </div>

        <ul className="space-y-3 max-w-md w-full mx-auto">
          {rows.map((r, i) => (
            <li
              key={r.city + i}
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur"
              style={{ animation: `slideIn 500ms ${i * 120}ms both cubic-bezier(0.22,1,0.36,1)` }}
            >
              <Flame className={`h-6 w-6 ${HEAT_COLOR[r.heat_level] ?? "text-amber-400"}`} />
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-base truncate">{r.city}</div>
                <div className="text-white/50 text-xs">
                  {r.waiting_homeowners} propriétaires · {HEAT_LABEL[r.heat_level] ?? "En croissance"}
                </div>
              </div>
              <span className="text-emerald-400 font-semibold text-sm">
                +{r.waiting_homeowners}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </WizardShell>
  );
}
