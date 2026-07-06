import { useEffect } from "react";
import WizardShell from "./WizardShell";
import { useScanWizardState } from "./useScanWizardState";

const LINES = ["Analyse du territoire…", "Analyse de la demande…", "Calcul de la capacité…", "Composition du plan…"];

export default function Step8Strategy() {
  const { next } = useScanWizardState();
  useEffect(() => {
    const t = setTimeout(() => next(), 2600);
    return () => clearTimeout(t);
  }, [next]);

  return (
    <WizardShell hidePrimary hideBack>
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="relative w-28 h-28 mb-8">
          <div className="absolute inset-0 rounded-full bg-sky-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-sky-500/30 to-emerald-500/20 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur border border-white/20 animate-pulse" />
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-white mb-6">Alex compose votre plan</h1>

        <ul className="space-y-2">
          {LINES.map((l, i) => (
            <li
              key={l}
              className="text-white/70 text-sm"
              style={{ animation: `fadeIn 600ms ${i * 550}ms both` }}
            >
              {l}
            </li>
          ))}
        </ul>

        <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
      </div>
    </WizardShell>
  );
}
