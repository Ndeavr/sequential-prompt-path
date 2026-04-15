import { Tag } from "lucide-react";
import type { AIPPv2Entity } from "@/hooks/useAIPPv2Audit";

const TYPE_LABELS: Record<string, string> = {
  brand: "Marque",
  service: "Service",
  city: "Ville",
  faq: "FAQ",
  schema: "Schema",
};

export default function PanelEntityAuthority({ entities }: { entities: AIPPv2Entity[] }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Tag className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Entités détectées</h3>
        <span className="ml-auto text-xs text-muted-foreground">{entities.length} trouvées</span>
      </div>
      {entities.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucune entité détectée.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {entities.map((e) => (
            <span
              key={e.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs"
            >
              <span className="font-medium capitalize">{e.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {TYPE_LABELS[e.entity_type] || e.entity_type}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
