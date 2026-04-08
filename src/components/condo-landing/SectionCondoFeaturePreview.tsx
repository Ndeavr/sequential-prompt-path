/**
 * UNPRO Condo — Feature Preview (teaser modules)
 */
import { FolderLock, FileCheck2, PiggyBank, CalendarDays, ListTodo, Bot, ArrowRightLeft, Eye } from "lucide-react";
import SectionContainer from "@/components/unpro/SectionContainer";
import SectionHeading from "@/components/unpro/SectionHeading";

const FEATURES = [
  { icon: FolderLock, title: "Voûte documentaire", desc: "Tous les documents du syndicat, organisés et accessibles en permanence." },
  { icon: FileCheck2, title: "Attestation guidée", desc: "Checklist intelligente pour préparer l'attestation de copropriété." },
  { icon: PiggyBank, title: "Suivi du fonds de prévoyance", desc: "Visualisez l'état du fonds et les projections futures." },
  { icon: CalendarDays, title: "Hub assemblées", desc: "Ordres du jour, procès-verbaux et votes centralisés." },
  { icon: ListTodo, title: "Timeline des tâches", desc: "Échéances, travaux et suivis en un coup d'œil." },
  { icon: Bot, title: "Assistant IA Condo", desc: "Posez vos questions, retrouvez un document, obtenez des réponses." },
  { icon: ArrowRightLeft, title: "Kit de relève du CA", desc: "Transmission structurée quand un administrateur quitte." },
  { icon: Eye, title: "Portail copropriétaires", desc: "Un accès clair pour chaque copropriétaire de l'immeuble." },
];

export default function SectionCondoFeaturePreview() {
  return (
    <SectionContainer>
      <SectionHeading
        label="Fonctionnalités à venir"
        title="Ce que UNPRO Condo va simplifier"
        description="Chaque module est pensé pour des gens qui n'ont pas le temps de chercher."
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="glass-card rounded-xl p-4 space-y-2 border border-border/40 hover:border-primary/30 transition-colors">
            <div className="p-2 rounded-lg bg-primary/10 w-fit">
              <f.icon className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-sm text-foreground">{f.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </SectionContainer>
  );
}
