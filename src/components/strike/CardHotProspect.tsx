import { Flame, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Target {
  id: string;
  business_name: string | null;
  city: string | null;
  category: string | null;
  engagement_level: string;
  priority_score: number;
}

export default function CardHotProspect({ target, onIntervene }: { target: Target; onIntervene?: (id: string) => void }) {
  return (
    <Card className="p-3 border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-red-500/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent animate-pulse pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-semibold text-orange-400 uppercase">Hot Lead</span>
          </div>
          <span className="text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded-full">
            Score: {target.priority_score}
          </span>
        </div>
        <h4 className="text-sm font-bold text-foreground mb-0.5">{target.business_name ?? "Inconnu"}</h4>
        <p className="text-[11px] text-muted-foreground">
          {[target.city, target.category].filter(Boolean).join(" · ") || "—"}
        </p>
        {onIntervene && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2 w-full text-xs border-orange-500/40 text-orange-300 hover:bg-orange-500/10"
            onClick={() => onIntervene(target.id)}
          >
            Intervenir maintenant <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>
    </Card>
  );
}
