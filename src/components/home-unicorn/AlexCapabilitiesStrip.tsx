/**
 * AlexCapabilitiesStrip — 6 capabilities en grille 3×2, toutes égales.
 */
import { HelpCircle, Camera, Calculator, FileCheck, BadgePercent, UserCheck, ArrowRight, type LucideIcon } from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";

interface Capability {
  icon: LucideIcon;
  label: string;
  topic: string;
}

const CAPS: Capability[] = [
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
        {CAPS.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.label}
              type="button"
              onClick={() => openAlex("home_capability", c.topic)}
              className="flex flex-col text-left px-3 py-3 transition-transform active:scale-[0.97] cursor-pointer relative"
              style={{
                borderRadius: 18,
                background: "#FFFFFF",
                border: "1px solid rgba(15,23,42,0.06)",
                boxShadow: "0 4px 14px -8px rgba(15,23,42,0.10), 0 1px 2px rgba(15,23,42,0.04)",
                minHeight: 118,
              }}
              aria-label={`Parler à Alex pour ${c.label.toLowerCase()}`}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center mb-2"
                style={{ background: "#EFF6FF" }}
              >
                <Icon size={18} color="#2563FF" strokeWidth={2.2} />
              </div>
              <span
                className="text-[12.5px] font-bold leading-tight"
                style={{ color: "#0B1220" }}
              >
                {c.label}
              </span>
              <ArrowRight
                size={16}
                color="#2563FF"
                strokeWidth={2.4}
                className="mt-auto self-end"
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
