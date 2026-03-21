import { Shield, Clock, Star, Award } from "lucide-react";

const trustItems = [
  { icon: Shield, label: "Vérifié UNPRO" },
  { icon: Clock, label: "Réponse rapide" },
  { icon: Star, label: "Avis authentiques" },
  { icon: Award, label: "Qualité garantie" },
];

export function TrustStrip() {
  return (
    <div className="flex items-center gap-4 overflow-x-auto py-2 scrollbar-hide">
      {trustItems.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-meta text-muted-foreground flex-shrink-0">
          <item.icon className="w-3.5 h-3.5 text-success" />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
