/**
 * AlexCapabilitiesStrip — Carte featured "Trouver un pro" + grille 2 col des 5 autres.
 */
import { HelpCircle, Camera, Calculator, FileCheck, BadgePercent, UserCheck, ArrowRight, type LucideIcon } from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";

interface Capability {
  icon: LucideIcon;
  label: string;
  topic: string;
}

const SECONDARY: Capability[] = [
  { icon: HelpCircle, label: "Comprendre un problème", topic: "comprendre votre problème" },
  { icon: Camera, label: "Analyser une photo", topic: "l'analyse d'une photo" },
  { icon: Calculator, label: "Estimer un coût", topic: "estimer un coût" },
  { icon: FileCheck, label: "Comparer une soumission", topic: "comparer votre soumission" },
  { icon: BadgePercent, label: "Trouver des subventions", topic: "trouver vos subventions" },
];

export default function AlexCapabilitiesStrip() {
  const { openAlex } = useAlexVoice();
  return (
    <section
      aria-label="Ce qu'Alex peut faire"
      className="px-4 mt-5 relative z-10 uc-fade-up"
      style={{ animationDelay: "90ms" }}
    >
      <div
        className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-2 px-1"
        style={{ color: "#2563FF" }}
      >
        Ce qu'Alex peut faire
      </div>

      {/* Featured — Trouver un pro */}
      <button
        type="button"
        onClick={() => openAlex("home_capability", "vous recommander le bon professionnel")}
        className="w-full flex items-center gap-3 px-4 py-4 mb-2 transition-transform active:scale-[0.98] cursor-pointer text-left"
        style={{
          borderRadius: 20,
          background: "linear-gradient(135deg, #2563FF 0%, #1D4FE0 100%)",
          boxShadow: "0 12px 28px -10px rgba(37,99,255,0.55), 0 2px 6px rgba(37,99,255,0.25)",
        }}
        aria-label="Parler à Alex pour trouver un pro"
      >
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.18)" }}
        >
          <UserCheck size={22} color="#FFFFFF" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[9.5px] font-semibold tracking-[0.16em] uppercase mb-0.5"
            style={{ color: "rgba(255,255,255,0.82)" }}
          >
            Recommandé
          </div>
          <div className="text-[17px] font-bold leading-tight text-white">
            Trouver un pro
          </div>
          <div
            className="text-[12.5px] leading-snug mt-0.5"
            style={{ color: "rgba(255,255,255,0.88)" }}
          >
            Alex vous recommande le bon professionnel selon votre besoin.
          </div>
        </div>
        <ArrowRight size={20} color="#FFFFFF" strokeWidth={2.4} className="shrink-0" />
      </button>

      {/* Secondary 2-col grid */}
      <div className="grid grid-cols-2 gap-2">
        {SECONDARY.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.label}
              type="button"
              onClick={() => openAlex("home_capability", c.topic)}
              className="flex items-center gap-2.5 text-left px-3 py-3 transition-transform active:scale-[0.97] cursor-pointer"
              style={{
                borderRadius: 16,
                background: "#FFFFFF",
                border: "1px solid rgba(15,23,42,0.06)",
                boxShadow: "0 4px 14px -8px rgba(15,23,42,0.10), 0 1px 2px rgba(15,23,42,0.04)",
                minHeight: 68,
              }}
              aria-label={`Parler à Alex pour ${c.label.toLowerCase()}`}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "#EFF6FF" }}
              >
                <Icon size={17} color="#2563FF" strokeWidth={2.2} />
              </div>
              <span
                className="text-[12.5px] font-semibold leading-tight flex-1"
                style={{ color: "#0B1220" }}
              >
                {c.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
