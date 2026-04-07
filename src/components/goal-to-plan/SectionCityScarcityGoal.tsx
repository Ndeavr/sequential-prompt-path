import { MapPin, Lock, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  city: string;
  onCheckCity: () => void;
}

const MOCK_CITIES = [
  { name: "Montréal", status: "disponible" },
  { name: "Laval", status: "presque_plein" },
  { name: "Québec", status: "disponible" },
  { name: "Longueuil", status: "exclusif" },
  { name: "Gatineau", status: "disponible" },
  { name: "Sherbrooke", status: "attente" },
];

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  disponible: { label: "Disponible", color: "text-success", icon: CheckCircle2 },
  presque_plein: { label: "Presque plein", color: "text-warning", icon: Clock },
  exclusif: { label: "Exclusif", color: "text-secondary", icon: Lock },
  attente: { label: "Liste d'attente", color: "text-muted-foreground", icon: Clock },
};

export default function SectionCityScarcityGoal({ city, onCheckCity }: Props) {
  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <MapPin className="w-6 h-6 text-warning mx-auto mb-3" />
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Places limitées par ville</h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
          UNPRO limite le nombre d'entrepreneurs activés par secteur pour protéger la qualité
          du matching et éviter la guerre de prix inutile.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto mb-8">
          {MOCK_CITIES.map(c => {
            const cfg = statusConfig[c.status] || statusConfig.disponible;
            return (
              <div key={c.name} className={`rounded-xl border border-border/50 bg-card/60 p-3 ${city === c.name ? "ring-2 ring-primary/30" : ""}`}>
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <div className={`flex items-center justify-center gap-1 mt-1 ${cfg.color}`}>
                  <cfg.icon className="w-3 h-3" />
                  <span className="text-xs">{cfg.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        <Button onClick={onCheckCity} variant="outline" className="gap-2">
          <MapPin className="w-4 h-4" /> Vérifier ma ville maintenant
        </Button>
      </div>
    </section>
  );
}
