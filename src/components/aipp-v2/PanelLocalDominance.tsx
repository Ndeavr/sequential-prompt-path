import { MapPin } from "lucide-react";
import type { AIPPv2Entity } from "@/hooks/useAIPPv2Audit";

interface Props {
  score: number;
  entities: AIPPv2Entity[];
}

export default function PanelLocalDominance({ score, entities }: Props) {
  const cities = entities.filter((e) => e.entity_type === "city");

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Dominance locale</h3>
        <span className="ml-auto text-lg font-bold text-foreground">{score}/100</span>
      </div>
      {cities.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucune ville détectée sur votre site. Créez des pages par ville pour améliorer votre visibilité locale.</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-3">
            {cities.length} ville{cities.length > 1 ? "s" : ""} détectée{cities.length > 1 ? "s" : ""} sur votre site.
          </p>
          <div className="flex flex-wrap gap-2">
            {cities.map((c) => (
              <span key={c.id} className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium capitalize">
                {c.name}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
