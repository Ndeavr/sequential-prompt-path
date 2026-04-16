import { Info } from "lucide-react";

export default function BannerImpactDisclaimer({ className }: { className?: string }) {
  return (
    <div className={`flex items-start gap-2 text-xs text-muted-foreground max-w-2xl mx-auto ${className ?? ""}`}>
      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/60" />
      <p>
        Compteur estimatif basé sur un modèle UNPRO. Ces chiffres représentent des projections plausibles et dynamiques, non une statistique officielle.
      </p>
    </div>
  );
}
