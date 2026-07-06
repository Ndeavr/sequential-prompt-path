import { ReactNode } from "react";
import { useScanWizardState, TOTAL_STEPS } from "./useScanWizardState";
import { ChevronLeft } from "lucide-react";

interface Props {
  children: ReactNode;
  canAdvance?: boolean;
  primaryLabel?: string;
  onPrimary?: () => void;
  hidePrimary?: boolean;
  hideBack?: boolean;
}

export default function WizardShell({
  children,
  canAdvance = true,
  primaryLabel = "Continuer",
  onPrimary,
  hidePrimary = false,
  hideBack = false,
}: Props) {
  const { step, next, prev } = useScanWizardState();

  return (
    <div className="min-h-[100dvh] bg-[#050816] text-white flex flex-col">
      {/* Header: back + dots */}
      <header className="flex items-center gap-3 px-5 pt-5 pb-3">
        {!hideBack && step > 1 ? (
          <button
            onClick={prev}
            className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition"
            aria-label="Précédent"
          >
            <ChevronLeft className="h-5 w-5 text-white/70" />
          </button>
        ) : (
          <div className="h-10 w-10" />
        )}
        <div className="flex-1 flex items-center justify-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i + 1 === step
                  ? "w-6 bg-amber-400"
                  : i + 1 < step
                  ? "w-1.5 bg-white/40"
                  : "w-1.5 bg-white/10"
              }`}
            />
          ))}
        </div>
        <div className="h-10 w-10" />
      </header>

      {/* Body */}
      <main
        key={step}
        className="flex-1 px-6 pt-2 pb-4 flex flex-col animate-[fadeSlide_420ms_cubic-bezier(0.22,1,0.36,1)]"
        style={{
          animationName: "fadeSlide",
        }}
      >
        {children}
      </main>

      {/* CTA */}
      {!hidePrimary && (
        <footer className="px-6 pb-8 pt-2">
          <button
            onClick={onPrimary ?? next}
            disabled={!canAdvance}
            className="w-full h-14 rounded-2xl bg-white text-[#050816] font-semibold text-base active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {primaryLabel}
          </button>
        </footer>
      )}

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
