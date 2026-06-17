/**
 * SectionAIHomeIntelligence — Category-defining section mounted on the homepage.
 *
 * Positions UNPRO as a Home Intelligence Platform (not a contractor marketplace).
 * Cinematic-dark, glass cards, master easing — aligned with the design system.
 */
import { AlertTriangle, ShieldCheck, Calculator, Wrench, UserCheck } from "lucide-react";

const CARDS = [
  {
    icon: AlertTriangle,
    title: "Identifier un problème",
    body: "Fissure, infiltration, isolation, moisissure, toiture, ventilation, humidité.",
  },
  {
    icon: ShieldCheck,
    title: "Comprendre les risques",
    body: "Ce qui peut attendre. Ce qui doit être corrigé rapidement.",
  },
  {
    icon: Calculator,
    title: "Estimer les coûts",
    body: "Ordres de grandeur basés sur des milliers de situations similaires.",
  },
  {
    icon: Wrench,
    title: "Trouver la bonne solution",
    body: "Réparation, entretien, rénovation ou expert.",
  },
  {
    icon: UserCheck,
    title: "Trouver le bon professionnel",
    body: "Seulement lorsque nécessaire.",
  },
] as const;

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

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {CARDS.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="uc-glass-strong p-5 transition-transform duration-[420ms]"
              style={{
                borderRadius: 28,
                transitionTimingFunction: "cubic-bezier(.22,1,.36,1)",
              }}
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
                style={{
                  background: "linear-gradient(135deg, #2563FF, #3B82F6)",
                  boxShadow: "0 8px 20px -8px rgba(37,99,255,0.55)",
                }}
              >
                <Icon size={18} color="white" strokeWidth={2.2} />
              </div>
              <h3
                className="font-bold text-[16px] mb-1.5"
                style={{ color: "#0B1220" }}
              >
                {title}
              </h3>
              <p className="text-[13.5px] leading-snug" style={{ color: "#475467" }}>
                {body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
