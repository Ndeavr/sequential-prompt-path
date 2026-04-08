/**
 * UNPRO Condo — How It Works (4 steps)
 */
import { FolderOpen, ListChecks, Search, ArrowRightLeft } from "lucide-react";
import SectionContainer from "@/components/unpro/SectionContainer";
import SectionHeading from "@/components/unpro/SectionHeading";

const STEPS = [
  { icon: FolderOpen, title: "Centraliser", desc: "Regroupez documents, données et historique de l'immeuble en un seul endroit sécurisé." },
  { icon: ListChecks, title: "Suivre", desc: "Obligations, fonds de prévoyance, tâches et échéances — tout est structuré et visible." },
  { icon: Search, title: "Retrouver", desc: "Recherche instantanée assistée par IA pour trouver n'importe quel document ou décision passée." },
  { icon: ArrowRightLeft, title: "Transmettre", desc: "Facilitez la transition entre administrateurs et gestionnaires sans perdre la mémoire de l'immeuble." },
];

export default function SectionCondoHowItWorks() {
  return (
    <SectionContainer id="comment-ca-fonctionne">
      <SectionHeading
        label="Comment ça fonctionne"
        title="4 étapes vers la clarté"
        description="Simple, crédible, sans promesse floue."
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {STEPS.map((s, i) => (
          <div key={s.title} className="relative glass-card rounded-xl p-5 space-y-3 border border-border/40">
            <span className="absolute top-3 right-4 text-3xl font-display font-bold text-muted/20">{i + 1}</span>
            <div className="p-2 rounded-lg bg-primary/10 w-fit">
              <s.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-foreground">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </SectionContainer>
  );
}
