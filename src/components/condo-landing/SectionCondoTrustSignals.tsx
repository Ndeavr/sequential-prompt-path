/**
 * UNPRO Condo — Trust Signals
 */
import { MapPin, Building2, Layout, Lock, ArrowRightLeft, Sparkles } from "lucide-react";
import SectionContainer from "@/components/unpro/SectionContainer";
import SectionHeading from "@/components/unpro/SectionHeading";

const SIGNALS = [
  { icon: MapPin, label: "Pensé pour le Québec" },
  { icon: Building2, label: "Adapté aux syndicats" },
  { icon: Layout, label: "Interface claire pour non-experts" },
  { icon: Lock, label: "Sécurité documentaire" },
  { icon: ArrowRightLeft, label: "Continuité administrative" },
  { icon: Sparkles, label: "IA utile, pas gadget" },
];

export default function SectionCondoTrustSignals() {
  return (
    <SectionContainer gradient>
      <SectionHeading
        label="Confiance"
        title="Pourquoi nous faire confiance"
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
        {SIGNALS.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5 rounded-xl bg-muted/20 border border-border/30 p-3">
            <s.icon className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </SectionContainer>
  );
}
