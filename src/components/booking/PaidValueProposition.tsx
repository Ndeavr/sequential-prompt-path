/**
 * Value proposition card explaining why a paid appointment is worth it.
 * Shown on public booking page for paid appointment types.
 */
import { CheckCircle, ShieldCheck, TrendingUp, Lightbulb } from "lucide-react";

interface Props {
  appointmentTitle: string;
  priceCents: number;
  category?: string;
}

const VALUE_MESSAGES: Record<string, { icon: React.ElementType; text: string }[]> = {
  diagnostic: [
    { icon: CheckCircle, text: "Analyse complète pour éviter des erreurs coûteuses" },
    { icon: ShieldCheck, text: "Diagnostic précis sur place par un expert" },
    { icon: TrendingUp, text: "Recommandations claires et immédiates" },
    { icon: Lightbulb, text: "Permet d'obtenir une solution claire immédiatement" },
  ],
  expertise: [
    { icon: CheckCircle, text: "Rapport détaillé de la situation" },
    { icon: ShieldCheck, text: "Évite les mauvaises surprises" },
    { icon: TrendingUp, text: "Recommandé pour situations complexes" },
    { icon: Lightbulb, text: "Inspection approfondie par un spécialiste" },
  ],
  default: [
    { icon: CheckCircle, text: "Rendez-vous avec un professionnel qualifié" },
    { icon: ShieldCheck, text: "Évite les mauvaises surprises" },
    { icon: TrendingUp, text: "Accélérez votre projet" },
  ],
};

export function PaidValueProposition({ appointmentTitle, priceCents, category }: Props) {
  if (priceCents <= 0) return null;

  const messages = VALUE_MESSAGES[category ?? ""] ?? VALUE_MESSAGES.default;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <p className="text-body font-semibold text-foreground">
        Pourquoi choisir {appointmentTitle.toLowerCase()} ?
      </p>
      <ul className="space-y-2">
        {messages.map((m, i) => (
          <li key={i} className="flex items-start gap-2.5 text-meta text-muted-foreground">
            <m.icon className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <span>{m.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
