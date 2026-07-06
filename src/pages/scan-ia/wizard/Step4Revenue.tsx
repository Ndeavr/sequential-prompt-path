import WizardShell from "./WizardShell";
import { useScanWizardState } from "./useScanWizardState";
import { useCountUp, fmtCAD } from "./useCountUp";

export default function Step4Revenue() {
  const { report } = useScanWizardState();
  const opp = Number(report?.opportunities?.estimated_revenue ?? 0);
  const value = useCountUp(opp, 1100);

  return (
    <WizardShell primaryLabel="Voir la demande">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="mb-3 text-xs uppercase tracking-[0.3em] text-white/50">
          Opportunité annuelle
        </div>

        <div className="text-5xl md:text-6xl font-semibold text-emerald-400 tracking-tight mb-4">
          {fmtCAD(value)}
        </div>

        <p className="text-white/70 text-base max-w-xs mb-8">
          Revenus supplémentaires estimés selon la demande active dans votre zone de service.
        </p>

        <p className="text-white/40 text-xs max-w-xs">
          Basé sur les propriétaires en attente, votre catégorie et le ticket moyen du marché.
        </p>
      </div>
    </WizardShell>
  );
}
