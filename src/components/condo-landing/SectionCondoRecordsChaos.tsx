/**
 * UNPRO Condo — Records Chaos (Before/After visual)
 */
import { X, Check } from "lucide-react";
import SectionContainer from "@/components/unpro/SectionContainer";
import SectionHeading from "@/components/unpro/SectionHeading";

const BEFORE = ["PDF perdus", "Clé USB du président", "Courriels introuvables", "Dossiers dispersés", "Aucun historique"];
const AFTER = ["Voûte numérique", "Accès partagé sécurisé", "Recherche IA instantanée", "Tout structuré", "Historique permanent"];

export default function SectionCondoRecordsChaos() {
  return (
    <SectionContainer>
      <SectionHeading
        label="Documents"
        title="Fini les PDF perdus et les clés USB introuvables"
      />
      <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
        <div className="glass-card rounded-xl p-5 border border-destructive/20 space-y-3">
          <h3 className="text-sm font-semibold text-destructive/80 uppercase tracking-wide">Avant</h3>
          <ul className="space-y-2">
            {BEFORE.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                <X className="h-3.5 w-3.5 text-destructive/60 shrink-0" /> {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="glass-card rounded-xl p-5 border border-success/20 space-y-3">
          <h3 className="text-sm font-semibold text-success uppercase tracking-wide">Avec UNPRO Condo</h3>
          <ul className="space-y-2">
            {AFTER.map((a) => (
              <li key={a} className="flex items-center gap-2 text-sm text-foreground">
                <Check className="h-3.5 w-3.5 text-success shrink-0" /> {a}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionContainer>
  );
}
