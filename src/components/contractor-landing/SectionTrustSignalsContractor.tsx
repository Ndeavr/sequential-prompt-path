import { Shield, Award, Zap, Clock } from "lucide-react";

const signals = [
  { icon: Shield, text: "Données vérifiées NEQ + RBQ" },
  { icon: Award, text: "Score AIPP exclusif à UNPRO" },
  { icon: Zap, text: "Rendez-vous qualifiés, pas des leads" },
  { icon: Clock, text: "Activation en moins de 24h" },
];

export default function SectionTrustSignalsContractor() {
  return (
    <section className="px-4 py-8 max-w-lg mx-auto">
      <div className="grid grid-cols-2 gap-3">
        {signals.map(({ icon: Icon, text }, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-lg border p-3">
            <Icon className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs font-medium">{text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
