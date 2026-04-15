import { Target } from "lucide-react";
import CardHotProspect from "./CardHotProspect";

interface StrikeTarget {
  id: string;
  business_name: string | null;
  city: string | null;
  category: string | null;
  engagement_level: string;
  priority_score: number;
}

export default function PanelConversionOpportunities({ hotProspects, onIntervene }: { hotProspects: StrikeTarget[]; onIntervene?: (id: string) => void }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-orange-400" />
        <h3 className="text-sm font-bold text-foreground">Opportunités de conversion</h3>
        {hotProspects.length > 0 && (
          <span className="text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded-full">{hotProspects.length}</span>
        )}
      </div>
      {hotProspects.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Aucun prospect chaud détecté encore</p>
      ) : (
        <div className="space-y-2">
          {hotProspects.map((t) => (
            <CardHotProspect key={t.id} target={t} onIntervene={onIntervene} />
          ))}
        </div>
      )}
    </div>
  );
}
