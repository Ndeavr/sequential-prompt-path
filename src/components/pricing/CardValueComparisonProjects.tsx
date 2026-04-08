import { Wrench, Hammer, Home } from "lucide-react";
import BadgeProjectSize from "./BadgeProjectSize";
import { cn } from "@/lib/utils";

interface ProjectCard {
  size: string;
  title: string;
  value: string;
  duration: string;
  insight: string;
  icon: React.ElementType;
  highlight?: boolean;
}

const CARDS: ProjectCard[] = [
  {
    size: "XS",
    title: "Réparation rapide",
    value: "150 – 500 $",
    duration: "30-60 min",
    insight: "Conversion élevée mais petit ticket",
    icon: Wrench,
  },
  {
    size: "M",
    title: "Isolation / Salle de bain",
    value: "1 500 – 5 000 $",
    duration: "2-4 heures",
    insight: "Bon équilibre valeur / effort",
    icon: Hammer,
    highlight: true,
  },
  {
    size: "XL",
    title: "Toiture / Projet majeur",
    value: "15 000 – 75 000 $",
    duration: "Plusieurs jours",
    insight: "1 seul rendez-vous = mois rentabilisé",
    icon: Home,
  },
];

export default function CardValueComparisonProjects() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.size}
            className={cn(
              "rounded-xl p-4 transition-all border",
              card.highlight
                ? "bg-primary/5 border-primary/20 shadow-sm"
                : "bg-card/50 border-border/30"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <BadgeProjectSize size={card.size} active={card.highlight} />
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">{card.title}</p>
            <p className="text-lg font-bold text-primary">💰 {card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">⏱ {card.duration}</p>
            <p className="text-xs text-muted-foreground mt-1">🎯 {card.insight}</p>
          </div>
        );
      })}
    </div>
  );
}
