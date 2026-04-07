import { Button } from "@/components/ui/button";
import { MapPin, Clock, Search, MessageSquare, Zap } from "lucide-react";

interface Props {
  onExpandRadius: () => void;
  onAcceptDelay: () => void;
  onChangeService: () => void;
  onJoinWaitlist: () => void;
  onWriteInstead: () => void;
}

export default function CardAlternativeOptions({ onExpandRadius, onAcceptDelay, onChangeService, onJoinWaitlist, onWriteInstead }: Props) {
  const options = [
    { icon: MapPin, label: "Élargir la zone de recherche", desc: "+10 à 25 km autour", action: onExpandRadius },
    { icon: Clock, label: "Accepter un délai plus long", desc: "Disponibilité dans 1-2 semaines", action: onAcceptDelay },
    { icon: Search, label: "Changer de type de service", desc: "Voir d'autres spécialités", action: onChangeService },
    { icon: Zap, label: "Me prévenir quand disponible", desc: "Liste d'attente intelligente", action: onJoinWaitlist },
    { icon: MessageSquare, label: "Continuer par écrit", desc: "Parler à Alex par texte", action: onWriteInstead },
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground mb-3">Essayons une autre option</h3>
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={opt.action}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors text-left"
        >
          <div className="shrink-0 h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <opt.icon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{opt.label}</p>
            <p className="text-xs text-muted-foreground">{opt.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
