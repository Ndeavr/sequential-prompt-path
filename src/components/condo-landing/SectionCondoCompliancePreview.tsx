/**
 * UNPRO Condo — Compliance Preview
 */
import { ShieldCheck, FileText, Clock, BookOpen, AlertCircle, ListOrdered } from "lucide-react";
import SectionContainer from "@/components/unpro/SectionContainer";
import SectionHeading from "@/components/unpro/SectionHeading";

const ITEMS = [
  { icon: FileText, label: "Conformité documentaire" },
  { icon: Clock, label: "Échéances clés" },
  { icon: BookOpen, label: "Registre de copropriété" },
  { icon: ShieldCheck, label: "Attestation" },
  { icon: ListOrdered, label: "Priorités d'action" },
  { icon: AlertCircle, label: "Alertes automatiques" },
];

export default function SectionCondoCompliancePreview() {
  return (
    <SectionContainer>
      <SectionHeading
        label="Conformité simplifiée"
        title="UNPRO Condo n'est pas juste un dossier numérique"
        description="C'est une structure guidée pour mieux comprendre ce qui manque, ce qui presse, et ce qui peut attendre."
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
        {ITEMS.map((it) => (
          <div key={it.label} className="glass-card rounded-xl p-4 flex items-center gap-3 border border-border/40">
            <it.icon className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-foreground">{it.label}</span>
          </div>
        ))}
      </div>
    </SectionContainer>
  );
}
