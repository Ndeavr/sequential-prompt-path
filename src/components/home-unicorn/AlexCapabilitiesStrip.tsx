/**
 * AlexCapabilitiesStrip — 6 compact tiles communicating what Alex can do.
 * Sits directly under the hero to make the breadth of UNPRO immediately legible.
 * Light glass tiles matching the unicorn-theme. No CTA noise.
 */
import { HelpCircle, Camera, Calculator, FileCheck, BadgePercent, UserCheck, type LucideIcon } from "lucide-react";

interface Capability {
  icon: LucideIcon;
  label: string;
}

const CAPABILITIES: Capability[] = [
  { icon: HelpCircle, label: "Comprendre un problème" },
  { icon: Camera, label: "Analyser une photo" },
  { icon: Calculator, label: "Estimer un coût" },
  { icon: FileCheck, label: "Comparer une soumission" },
  { icon: BadgePercent, label: "Trouver des subventions" },
  { icon: UserCheck, label: "Recommander un professionnel" },
];

export default function AlexCapabilitiesStrip() {
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
            <div
              key={c.label}
              className="uc-glass-strong flex flex-col items-center justify-center text-center gap-1.5 px-2 py-3"
              style={{ borderRadius: 18 }}
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
            </div>
          );
        })}
      </div>
    </section>
  );
}
