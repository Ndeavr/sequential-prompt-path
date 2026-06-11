/**
 * AlexCapabilitiesStrip — featured "Trouver un pro" + secondary 2-col grid.
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
        className="w-full mb-2 flex items-center gap-3 text-left px-4 py-4 transition-transform active:scale-[0.98] cursor-pointer relative overflow-hidden"
        style={{
          borderRadius: 22,
          background: "linear-gradient(135deg, #2563FF 0%, #1D4ED8 100%)",
          boxShadow: "0 14px 38px -12px rgba(37,99,255,0.55), 0 2px 6px rgba(37,99,255,0.18)",
        }}
        aria-label="Parler à Alex pour trouver un pro"
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.18)" }}
        >
          <UserCheck size={22} color="#FFFFFF" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[10px] font-semibold tracking-[0.14em] uppercase mb-0.5"
            style={{ color: "rgba(255,255,255,0.78)" }}
          >
            Recommandé
          </div>
          <div className="text-[15px] font-bold leading-tight text-white">
            Trouver un pro
          </div>
          <div className="text-[11.5px] leading-snug mt-0.5" style={{ color: "rgba(255,255,255,0.82)" }}>
            Alex vous recommande le bon professionnel selon votre besoin.
          </div>
        </div>
        <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.4} className="shrink-0" />
      </button>

      {/* Secondary grid */}
      <div className="grid grid-cols-2 gap-2">
        {SECONDARY.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.label}
              type="button"
              onClick={() => openAlex("home_capability", c.topic)}
              className="uc-glass-strong flex items-center gap-2 text-left px-3 py-3 transition-transform active:scale-[0.97] cursor-pointer"
              style={{ borderRadius: 16 }}
              aria-label={`Parler à Alex pour ${c.label.toLowerCase()}`}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "#EFF6FF" }}
              >
                <Icon size={16} color="#2563FF" strokeWidth={2.2} />
              </div>
              <span
                className="text-[11.5px] font-semibold leading-tight"
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
