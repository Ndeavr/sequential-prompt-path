import { ShieldCheck, Umbrella, Target, DollarSign, CalendarCheck, Trophy } from "lucide-react";

const BADGES = [
  { icon: ShieldCheck, label: "RBQ vérifiée" },
  { icon: Umbrella, label: "Assurances vérifiées" },
  { icon: Target, label: "Spécialité compatible" },
  { icon: DollarSign, label: "Budget compatible" },
  { icon: CalendarCheck, label: "Disponibilité compatible" },
  { icon: Trophy, label: "Performance vérifiée" },
];

export default function SectionWhyThisContractor() {
  return (
    <section className="bg-background py-14 md:py-20 px-5">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-8 md:mb-12">
          Pourquoi cet entrepreneur ?
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 md:gap-6">
          {BADGES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center text-center">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl border border-primary/30 bg-primary/5 flex items-center justify-center mb-3">
                <Icon className="h-7 w-7 md:h-8 md:w-8 text-primary" strokeWidth={1.75} />
              </div>
              <p className="text-xs md:text-sm text-foreground/80 leading-tight">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
