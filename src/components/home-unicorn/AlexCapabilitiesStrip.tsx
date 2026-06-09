/**
 * AlexCapabilitiesStrip — 6 compact tiles communicating what Alex can do.
 * Sits directly under the hero to make the breadth of UNPRO immediately legible.
 * Tapping a tile opens Alex with a contextual opening line.
 */
import { HelpCircle, Camera, Calculator, FileCheck, BadgePercent, UserCheck, type LucideIcon } from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";

interface Capability {
  icon: LucideIcon;
  label: string;
  /** Phrase used in Alex's opening: "Je peux définitivement vous aider avec {topic}." */
  topic: string;
}

const CAPABILITIES: Capability[] = [
  { icon: HelpCircle, label: "Comprendre un problème", topic: "comprendre votre problème" },
  { icon: Camera, label: "Analyser une photo", topic: "l'analyse d'une photo" },
  { icon: Calculator, label: "Estimer un coût", topic: "estimer un coût" },
  { icon: FileCheck, label: "Comparer une soumission", topic: "comparer votre soumission" },
  { icon: BadgePercent, label: "Trouver des subventions", topic: "trouver vos subventions" },
  { icon: UserCheck, label: "Recommander un professionnel", topic: "vous recommander le bon professionnel" },
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
      <div className="grid grid-cols-3 gap-2">
        {CAPABILITIES.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.label}
              type="button"
              onClick={() => openAlex("home_capability", c.topic)}
              className="uc-glass-strong flex flex-col items-center justify-center text-center gap-1.5 px-2 py-3 transition-transform active:scale-[0.97] cursor-pointer"
              style={{ borderRadius: 18 }}
              aria-label={`Parler à Alex pour ${c.label.toLowerCase()}`}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "#EFF6FF" }}
              >
                <Icon size={18} color="#2563FF" strokeWidth={2.2} />
              </div>
              <span
                className="text-[11px] font-semibold leading-tight"
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
