/**
 * UNPRO Condo — Board Turnover Section
 */
import { UserMinus, FolderSync, History, KeyRound, CalendarClock, FileStack } from "lucide-react";
import SectionContainer from "@/components/unpro/SectionContainer";
import SectionHeading from "@/components/unpro/SectionHeading";

const ITEMS = [
  { icon: FileStack, label: "Documents" },
  { icon: UserMinus, label: "Fournisseurs" },
  { icon: History, label: "Décisions passées" },
  { icon: CalendarClock, label: "Échéances" },
  { icon: FolderSync, label: "Historique complet" },
  { icon: KeyRound, label: "Accès centralisés" },
];

export default function SectionCondoBoardTurnover() {
  return (
    <SectionContainer gradient>
      <SectionHeading
        label="Relève du CA"
        title="Quand un administrateur quitte, l'immeuble ne doit pas perdre sa mémoire."
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
        {ITEMS.map((it) => (
          <div key={it.label} className="flex items-center gap-2.5 rounded-xl bg-muted/30 border border-border/30 p-3">
            <it.icon className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-foreground">{it.label}</span>
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground mt-6 max-w-lg mx-auto">
        Avec UNPRO Condo, le prochain administrateur reprend là où le précédent a laissé — sans perdre une seule information.
      </p>
    </SectionContainer>
  );
}
