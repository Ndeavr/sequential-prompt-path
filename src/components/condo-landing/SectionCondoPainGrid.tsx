/**
 * UNPRO Condo — Pain Grid Section
 * Real irritants for QC condo boards, presented as premium cards.
 */
import { FileWarning, Users, Table2, FolderSearch, Stamp, ShieldAlert } from "lucide-react";
import SectionContainer from "@/components/unpro/SectionContainer";
import SectionHeading from "@/components/unpro/SectionHeading";

const PAINS = [
  {
    icon: FileWarning,
    title: "Confusion Loi 16",
    problem: "Personne au CA ne sait exactement ce qui est exigé ni par où commencer.",
    solution: "UNPRO structure les obligations et montre ce qui manque.",
  },
  {
    icon: Users,
    title: "Roulement du CA",
    problem: "Quand un administrateur part, l'historique et les accès disparaissent avec lui.",
    solution: "Tout reste centralisé, la relève reprend en quelques minutes.",
  },
  {
    icon: Table2,
    title: "Gestion par tableur",
    problem: "Excel pour les finances, courriels pour les suivis, clé USB pour les documents.",
    solution: "Une seule plateforme remplace les outils fragmentés.",
  },
  {
    icon: FolderSearch,
    title: "Documents introuvables",
    problem: "Le procès-verbal de 2022? Le devis du toiturier? Personne ne sait où chercher.",
    solution: "Voûte documentaire structurée avec recherche instantanée.",
  },
  {
    icon: Stamp,
    title: "Stress de l'attestation",
    problem: "L'attestation de copropriété exige des documents que personne n'a regroupés.",
    solution: "Checklist guidée pour préparer l'attestation sans panique.",
  },
  {
    icon: ShieldAlert,
    title: "Autogestion chaotique",
    problem: "Les petites copropriétés font tout elles-mêmes sans outil adapté.",
    solution: "Interface pensée pour les bénévoles, pas les gestionnaires professionnels.",
  },
];

export default function SectionCondoPainGrid() {
  return (
    <SectionContainer>
      <SectionHeading
        label="Les vrais irritants"
        title="Ce que vivent les copropriétés au Québec"
        description="Chaque problème est réel. Chaque solution est concrète."
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PAINS.map((p) => (
          <div key={p.title} className="glass-card rounded-xl p-5 space-y-3 border border-border/40">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <p.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground text-sm">{p.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{p.problem}</p>
            <p className="text-sm text-primary/80 leading-relaxed">→ {p.solution}</p>
          </div>
        ))}
      </div>
    </SectionContainer>
  );
}
