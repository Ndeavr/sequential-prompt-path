import WizardShell from "./WizardShell";
import { useScanWizardState } from "./useScanWizardState";
import { ArrowDown } from "lucide-react";

export default function Step10Projection() {
  const { report, capacity } = useScanWizardState();
  const today = Math.max(1, report?.today_jobs_per_month ?? 4);
  const topCityDemand =
    (report?.territory_demand?.[0]?.waiting_homeowners as number) ?? capacity;
  const projected = today + Math.min(capacity, topCityDemand);

  const max = Math.max(today, projected);
  const todayW = (today / max) * 100;
  const projW = (projected / max) * 100;

  return (
    <WizardShell primaryLabel="Activer mon profil">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="text-center text-xs uppercase tracking-[0.3em] text-white/50 mb-2">
            Aujourd'hui
          </div>
          <div className="mb-2 h-14 rounded-xl bg-white/10 overflow-hidden">
            <div
              className="h-full bg-white/40 flex items-center justify-end pr-4 text-white font-semibold"
              style={{ width: `${todayW}%`, transition: "width 700ms cubic-bezier(0.22,1,0.36,1)" }}
            >
              {today}
            </div>
          </div>
          <div className="text-white/50 text-sm text-center mb-8">projets / mois</div>

          <div className="flex justify-center mb-6">
            <ArrowDown className="h-6 w-6 text-amber-400 animate-bounce" />
          </div>

          <div className="text-center text-xs uppercase tracking-[0.3em] text-emerald-300 mb-2">
            Avec UNPRO
          </div>
          <div className="mb-2 h-14 rounded-xl bg-emerald-500/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 flex items-center justify-end pr-4 text-white font-semibold"
              style={{ width: `${projW}%`, transition: "width 900ms 300ms cubic-bezier(0.22,1,0.36,1)" }}
            >
              {projected}
            </div>
          </div>
          <div className="text-emerald-400 text-sm text-center font-medium">
            +{projected - today} projets additionnels / mois
          </div>
        </div>
      </div>
    </WizardShell>
  );
}
