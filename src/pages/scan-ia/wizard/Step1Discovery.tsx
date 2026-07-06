import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import WizardShell from "./WizardShell";
import { useScanWizardState } from "./useScanWizardState";

const CHECKS = [
  { label: "Site web analysé", key: "website" },
  { label: "Avis analysés", key: "reviews" },
  { label: "Zone de service détectée", key: "area" },
  { label: "Demande calculée", key: "demand" },
];

export default function Step1Discovery() {
  const { report, next } = useScanWizardState();
  const [revealed, setRevealed] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setRevealed((r) => (r < CHECKS.length ? r + 1 : r));
    }, 380);
    const p = setInterval(() => {
      setProgress((v) => (v < 100 ? Math.min(100, v + 6) : v));
    }, 90);
    return () => {
      clearInterval(id);
      clearInterval(p);
    };
  }, []);

  const done = revealed >= CHECKS.length && progress >= 100;

  return (
    <WizardShell canAdvance={done} onPrimary={next} primaryLabel="Découvrir mon entreprise">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="mb-8 relative w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-sky-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-[#050816] border border-sky-400/30 flex items-center justify-center">
            <span className="text-sky-300 font-semibold text-sm tracking-widest">SCAN IA</span>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">
          Analyse de {report?.business_name ?? "votre entreprise"}
        </h1>
        <p className="text-white/50 text-sm mb-8">Alex récupère vos données publiques en temps réel.</p>

        <ul className="w-full max-w-xs space-y-3 mb-8">
          {CHECKS.map((c, i) => (
            <li
              key={c.key}
              className={`flex items-center gap-3 text-sm transition-all duration-500 ${
                i < revealed ? "opacity-100 translate-y-0" : "opacity-30 translate-y-1"
              }`}
            >
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center ${
                  i < revealed ? "bg-emerald-500/20 text-emerald-400" : "bg-white/5 text-white/30"
                }`}
              >
                {i < revealed ? <Check className="h-4 w-4" /> : <Loader2 className="h-3 w-3 animate-spin" />}
              </span>
              <span className={i < revealed ? "text-white" : "text-white/40"}>{c.label}</span>
            </li>
          ))}
        </ul>

        <div className="w-full max-w-xs">
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-white/50">{progress}% complété</div>
        </div>
      </div>
    </WizardShell>
  );
}
