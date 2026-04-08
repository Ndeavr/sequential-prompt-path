/**
 * UNPRO Condo — Legacy vs UNPRO Comparison
 */
import { X, Check } from "lucide-react";
import SectionContainer from "@/components/unpro/SectionContainer";
import SectionHeading from "@/components/unpro/SectionHeading";

const ROWS = [
  { label: "Documents", legacy: "Éparpillés partout", unpro: "Voûte centralisée" },
  { label: "Historique", legacy: "Perdu à chaque relève", unpro: "Structuré et permanent" },
  { label: "Relève du CA", legacy: "Chaotique", unpro: "Guidée en quelques clics" },
  { label: "Conformité", legacy: "Obscure", unpro: "Vue claire des priorités" },
  { label: "Outils", legacy: "Excel, courriels, clé USB", unpro: "Une seule plateforme" },
  { label: "Prochaine étape", legacy: "Personne ne sait", unpro: "Système guidé par IA" },
];

export default function SectionCondoComparison() {
  return (
    <SectionContainer>
      <SectionHeading
        label="Avant / Après"
        title="Fini le chaos, place à la clarté"
      />
      <div className="max-w-3xl mx-auto glass-card rounded-xl border border-border/40 overflow-hidden">
        <div className="grid grid-cols-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40 p-4">
          <span />
          <span className="text-center">Ancien mode</span>
          <span className="text-center text-primary">UNPRO Condo</span>
        </div>
        {ROWS.map((r, i) => (
          <div key={r.label} className={`grid grid-cols-3 items-center p-4 text-sm ${i < ROWS.length - 1 ? "border-b border-border/20" : ""}`}>
            <span className="font-medium text-foreground">{r.label}</span>
            <span className="text-center text-muted-foreground flex items-center justify-center gap-1.5">
              <X className="h-3.5 w-3.5 text-destructive/60" /> {r.legacy}
            </span>
            <span className="text-center text-primary/90 flex items-center justify-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-success" /> {r.unpro}
            </span>
          </div>
        ))}
      </div>
    </SectionContainer>
  );
}
