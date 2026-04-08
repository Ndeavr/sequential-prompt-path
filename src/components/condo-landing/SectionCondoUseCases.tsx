/**
 * UNPRO Condo — Use Cases Section
 */
import { Building, Users, TrendingUp, Briefcase, FileCheck } from "lucide-react";
import SectionContainer from "@/components/unpro/SectionContainer";
import SectionHeading from "@/components/unpro/SectionHeading";

const CASES = [
  { icon: Building, title: "Petit syndicat (2–8 unités)", desc: "Pas de gestionnaire? UNPRO Condo guide les bénévoles étape par étape." },
  { icon: Users, title: "Copropriété autogérée", desc: "Tout faire soi-même ne veut pas dire tout faire sans outil." },
  { icon: TrendingUp, title: "CA en croissance", desc: "L'immeuble grandit, les responsabilités aussi. Gardez le contrôle." },
  { icon: Briefcase, title: "Gestionnaire professionnel", desc: "Centralisez vos immeubles et montrez votre rigueur à vos clients." },
  { icon: FileCheck, title: "Préparation attestation", desc: "Regroupez tout ce qu'il faut pour produire l'attestation de copropriété." },
];

export default function SectionCondoUseCases() {
  return (
    <SectionContainer>
      <SectionHeading
        label="Pour qui"
        title="Chaque copropriété a ses défis"
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {CASES.map((c) => (
          <div key={c.title} className="glass-card rounded-xl p-5 space-y-2 border border-border/40">
            <c.icon className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold text-sm text-foreground">{c.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>
    </SectionContainer>
  );
}
