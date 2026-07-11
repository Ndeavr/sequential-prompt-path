/**
 * SectionAIHomeIntelligence — Homeowner-journey section on the homepage.
 *
 * 5 connected steps: Diagnostic → Risques → Budget → Solutions → Recommandation.
 * Cinematic-dark friendly, glass cards, subtle progression rail.
 */
import { AlertTriangle, ShieldCheck, Calculator, Wrench, Handshake } from "lucide-react";

type Card = {
  step: string;
  stepLabel: string;
  icon: typeof AlertTriangle;
  title: string;
  body: string;
  examples?: string;
};

const CARDS: Card[] = [
  {
    step: "01",
    stepLabel: "Diagnostic",
    icon: AlertTriangle,
    title: "Identifier le problème",
    body: "Comprendre ce qui se passe réellement dans votre maison avant de prendre une décision.",
    examples: "Fissure, infiltration, isolation, moisissure, toiture, ventilation, humidité.",
  },
  {
    step: "02",
    stepLabel: "Risques",
    icon: ShieldCheck,
    title: "Comprendre les risques",
    body: "Distinguer ce qui peut attendre de ce qui doit être corrigé rapidement.",
  },
  {
    step: "03",
    stepLabel: "Budget",
    icon: Calculator,
    title: "Estimer les coûts",
    body: "Obtenir un ordre de grandeur basé sur des milliers de situations similaires.",
  },
  {
    step: "04",
    stepLabel: "Solutions",
    icon: Wrench,
    title: "Découvrir les meilleures solutions",
    body: "Comparer les approches possibles selon votre situation, votre budget et vos objectifs.",
  },
  {
    step: "05",
    stepLabel: "Recommandation",
    icon: Handshake,
    title: "Trouver le professionnel qui vous correspond",
    body: "L'IA identifie l'entrepreneur le plus compatible avec vos besoins, votre budget, votre secteur et votre projet.",
  },
];

export default function SectionAIHomeIntelligence() {
  return (
    <section
      aria-label="Intelligence artificielle pour votre maison"
      className="relative px-4 py-12 md:py-16"
      style={{
        background:
          "linear-gradient(180deg, rgba(5,8,22,0) 0%, rgba(5,8,22,0.55) 50%, rgba(5,8,22,0) 100%)",
      }}
    >
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-8 md:mb-10">
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#3B82F6] mb-3">
            UNPRO · Home Intelligence
          </p>
          <h2
            className="font-extrabold text-[26px] sm:text-[34px] leading-[1.05] tracking-[-0.035em]"
            style={{ color: "#0B1220" }}
          >
            L'intelligence artificielle pour votre maison.
          </h2>
        </header>

        {/* Progression rail */}
        <ol className="hidden md:flex items-center justify-between max-w-3xl mx-auto mb-10 gap-2">
          {CARDS.map((c, i) => (
            <li key={c.step} className="flex-1 flex items-center gap-2">
              <div className="flex flex-col items-center gap-1 min-w-0">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                  style={{
                    background: "linear-gradient(135deg, #2563FF, #3B82F6)",
                    boxShadow: "0 4px 12px -4px rgba(37,99,255,0.5)",
                  }}
                >
                  {i + 1}
                </span>
                <span
                  className="text-[11px] font-semibold tracking-wide"
                  style={{ color: "#475467" }}
                >
                  {c.stepLabel}
                </span>
              </div>
              {i < CARDS.length - 1 && (
                <div
                  className="flex-1 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(37,99,255,0.35), rgba(37,99,255,0.1))",
                  }}
                />
              )}
            </li>
          ))}
        </ol>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {CARDS.map(({ step, stepLabel, icon: Icon, title, body, examples }) => (
            <li
              key={title}
              className="group relative uc-glass-strong p-5 transition-all duration-[420ms] hover:-translate-y-1"
              style={{
                borderRadius: 28,
                transitionTimingFunction: "cubic-bezier(.22,1,.36,1)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 24px 60px -20px rgba(37,99,255,0.35), 0 0 0 1px rgba(59,130,246,0.25) inset";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "";
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center transition-transform duration-[420ms] group-hover:scale-110 group-hover:rotate-[-4deg]"
                  style={{
                    background: "linear-gradient(135deg, #2563FF, #3B82F6)",
                    boxShadow: "0 8px 20px -8px rgba(37,99,255,0.55)",
                    transitionTimingFunction: "cubic-bezier(.22,1,.36,1)",
                  }}
                >
                  <Icon size={18} color="white" strokeWidth={2.2} />
                </div>
                <span
                  className="text-[10px] font-bold tracking-[0.18em] mt-1"
                  style={{ color: "#3B82F6" }}
                >
                  {step} · {stepLabel.toUpperCase()}
                </span>
              </div>
              <h3
                className="font-bold text-[16px] mb-1.5 leading-tight"
                style={{ color: "#0B1220" }}
              >
                {title}
              </h3>
              <p className="text-[13.5px] leading-snug" style={{ color: "#475467" }}>
                {body}
              </p>
              {examples && (
                <p
                  className="mt-3 pt-3 text-[12px] leading-snug italic border-t"
                  style={{ color: "#64748B", borderColor: "rgba(11,18,32,0.08)" }}
                >
                  {examples}
                </p>
              )}
            </li>
          ))}
        </ul>

        {/* Microcopy — positioning statement */}
        <div className="mt-12 md:mt-16 text-center max-w-2xl mx-auto">
          <h3
            className="font-extrabold text-[20px] sm:text-[24px] leading-tight tracking-[-0.02em] mb-3"
            style={{ color: "#0B1220" }}
          >
            Une meilleure décision commence par une meilleure compréhension.
          </h3>
          <p className="text-[14.5px] leading-relaxed" style={{ color: "#475467" }}>
            UNPRO vous aide à comprendre votre situation avant de vous recommander le bon
            professionnel.
          </p>
        </div>
      </div>
    </section>
  );
}
