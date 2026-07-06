import WizardShell from "./WizardShell";
import { useScanWizardState } from "./useScanWizardState";
import { avgTicketFor } from "@/config/scanCapacityTickets";
import { fmtCAD } from "./useCountUp";

export default function Step7Capacity() {
  const { report, capacity, setCapacity } = useScanWizardState();
  const ticket = avgTicketFor(report?.category);
  const projected = capacity * ticket * 12;

  return (
    <WizardShell>
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="mb-3 text-xs uppercase tracking-[0.3em] text-white/50">
          Capacité mensuelle
        </div>
        <h1 className="text-2xl font-semibold text-white mb-8 max-w-xs">
          Combien de projets pouvez-vous ajouter par mois
        </h1>

        <div className="text-7xl font-semibold text-white tracking-tight mb-2">{capacity}</div>
        <div className="text-white/50 text-sm mb-8">projets / mois</div>

        <input
          type="range"
          min={1}
          max={30}
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
          className="w-full max-w-xs h-2 rounded-full bg-white/10 appearance-none accent-amber-400 mb-2"
        />
        <div className="w-full max-w-xs flex justify-between text-xs text-white/40 mb-8">
          <span>1</span>
          <span>15</span>
          <span>30</span>
        </div>

        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/20 px-6 py-4">
          <div className="text-xs text-emerald-300 mb-1">Revenu potentiel additionnel</div>
          <div className="text-2xl font-semibold text-emerald-400">{fmtCAD(projected)}</div>
          <div className="text-xs text-white/50 mt-1">/ année</div>
        </div>
      </div>
    </WizardShell>
  );
}
