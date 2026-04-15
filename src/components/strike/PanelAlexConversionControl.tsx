import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StrikeTarget {
  id: string;
  business_name: string | null;
  city: string | null;
  status: string;
  engagement_level: string;
}

export default function PanelAlexConversionControl({ targets, onTriggerAlex }: { targets: StrikeTarget[]; onTriggerAlex?: (id: string) => void }) {
  const eligible = targets.filter((t) => t.engagement_level === "hot" && t.status !== "converted");

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Bot className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Contrôle Alex</h3>
      </div>
      {eligible.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Aucun prospect éligible pour intervention Alex</p>
      ) : (
        <div className="space-y-2">
          {eligible.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/20">
              <div>
                <p className="text-xs font-medium text-foreground">{t.business_name ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">{t.city ?? "—"}</p>
              </div>
              {onTriggerAlex && (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onTriggerAlex(t.id)}>
                  <Send className="w-3 h-3 mr-1" /> Alex
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
