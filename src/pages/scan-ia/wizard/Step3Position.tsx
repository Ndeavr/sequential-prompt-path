import WizardShell from "./WizardShell";
import { useScanWizardState } from "./useScanWizardState";
import { useCountUp } from "./useCountUp";
import { TrendingUp } from "lucide-react";

export default function Step3Position() {
  const { report } = useScanWizardState();
  const mp = report?.market_position ?? {};
  const pct = Number(mp.percentile ?? 0);
  const animated = useCountUp(pct, 900);
  const metrics: Array<{ label: string; value: number }> = mp.metrics ?? [];

  return (
    <WizardShell primaryLabel="Voir l'opportunité">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="mb-3 text-xs uppercase tracking-[0.3em] text-white/50">
          Votre classement
        </div>

        <div className="mb-2 flex items-baseline">
          <span className="text-[6.5rem] leading-none font-semibold text-white tracking-tighter">
            {animated}
          </span>
          <span className="text-3xl text-white/40 ml-1">%</span>
        </div>

        <div className="mb-8 inline-flex items-center gap-2 text-emerald-400 text-sm font-medium">
          <TrendingUp className="h-4 w-4" />
          Vous dépassez la majorité des entrepreneurs locaux
        </div>

        <div className="w-full max-w-xs space-y-3">
          {metrics.map((m) => (
            <div key={m.label}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-white/60">{m.label}</span>
                <span className="text-white font-medium">{m.value}</span>
              </div>
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-700"
                  style={{ width: `${m.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </WizardShell>
  );
}
