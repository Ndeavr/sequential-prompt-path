import { useStrikeDashboard } from "@/hooks/useStrikeDashboard";
import { Card } from "@/components/ui/card";
import { Settings, ArrowRight } from "lucide-react";

export default function PageAdminStrikeAdjustments() {
  const { adjustments, session, isLoading } = useStrikeDashboard();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-pulse text-muted-foreground text-sm">Chargement…</div></div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Settings className="w-4 h-4 text-primary" />
        <h1 className="text-lg font-bold text-foreground">Ajustements</h1>
      </div>

      {!session && (
        <p className="text-sm text-muted-foreground text-center py-8">Aucun strike actif</p>
      )}

      {adjustments.length === 0 && session && (
        <p className="text-sm text-muted-foreground text-center py-8">Aucun ajustement effectué encore</p>
      )}

      <div className="space-y-2">
        {adjustments.map((a) => (
          <Card key={a.id} className="p-3 bg-card/50 border-border/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-foreground uppercase">{a.type}</span>
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                Impact: {a.impact_score}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate max-w-[120px]">{a.previous_value ?? "—"}</span>
              <ArrowRight className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[120px] text-foreground">{a.new_value ?? "—"}</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {new Date(a.created_at).toLocaleString("fr-CA")}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
