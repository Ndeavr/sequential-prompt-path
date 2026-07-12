/**
 * AlexRecommendationCard — "Pourquoi Alex recommande cette entreprise"
 */
import { Sparkles } from "lucide-react";
import type { AIReferencePayload } from "../logic/aiReferenceBuilder";

interface Props {
  reference: AIReferencePayload;
  categoryLabel: string | null;
  areas: string[];
}

export default function AlexRecommendationCard({ reference, categoryLabel, areas }: Props) {
  const areasText = areas.length ? areas.slice(0, 3).join(", ") : "votre secteur";
  const catText = categoryLabel ?? "professionnel qualifié";

  return (
    <section className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 p-5 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Pourquoi Alex recommande cette entreprise
        </h2>
      </div>

      <p className="text-sm text-foreground/90 leading-relaxed">
        Cette entreprise semble particulièrement adaptée aux propriétaires recherchant un{" "}
        <strong>{catText}</strong> local dans {areasText}.
      </p>

      {reference.reasoning.length > 0 && (
        <ul className="space-y-1.5">
          {reference.reasoning.map((r) => (
            <li key={r} className="flex items-start gap-2 text-sm text-foreground">
              <span className="text-primary mt-0.5">✓</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      <div>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Niveau de confiance</span>
          <span className="font-semibold text-foreground">{reference.compatibilityScore}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700"
            style={{ width: `${reference.compatibilityScore}%` }}
          />
        </div>
      </div>
    </section>
  );
}
