import { Check, X } from "lucide-react";

const FEATURES = [
  { label: "Diagnostic IA", free: true, paid: true },
  { label: "Score de conformité", free: true, paid: true },
  { label: "3 actions guidées", free: true, paid: true },
  { label: "Aperçu des risques", free: true, paid: true },
  { label: "Checklist complète", free: false, paid: true },
  { label: "Flow Alex illimité", free: false, paid: true },
  { label: "Documents + archivage", free: false, paid: true },
  { label: "Alertes automatiques", free: false, paid: true },
  { label: "Passeport Condo", free: false, paid: true },
];

export default function PanelPlanComparisonCondo() {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-display font-semibold text-foreground text-center">
        Gratuit vs Premium
      </h4>
      <div className="grid grid-cols-[1fr,auto,auto] gap-x-4 gap-y-2 text-sm">
        <div className="text-xs text-muted-foreground font-medium">Fonctionnalité</div>
        <div className="text-xs text-muted-foreground font-medium text-center">Gratuit</div>
        <div className="text-xs text-primary font-medium text-center">Premium</div>

        {FEATURES.map((f) => (
          <>
            <div key={f.label} className="text-foreground py-1">{f.label}</div>
            <div className="flex justify-center py-1">
              {f.free ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <X className="h-4 w-4 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex justify-center py-1">
              <Check className="h-4 w-4 text-primary" />
            </div>
          </>
        ))}
      </div>
    </div>
  );
}
