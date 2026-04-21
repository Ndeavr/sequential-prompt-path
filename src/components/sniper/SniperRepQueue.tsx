import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Phone, RotateCcw, XCircle, ArrowRight } from "lucide-react";
import { getHeatLabel } from "@/services/planRecommendationService";

export function SniperRepQueue({ targets }: { targets: any[] }) {
  const hotTargets = targets
    .filter(t => ["engaged", "audit_started", "audit_completed", "checkout_started"].includes(t.outreach_status) || (t.heat_score || 0) >= 40)
    .sort((a, b) => (b.heat_score || 0) - (a.heat_score || 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" /> File d'action rep
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hotTargets.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Aucun lead à traiter pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {hotTargets.map((t) => {
              const heat = getHeatLabel(t.heat_score || 0);
              return (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-border/30 bg-card/10 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{t.business_name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{t.city || "—"}</span>
                      <span>·</span>
                      <span>{t.category || "—"}</span>
                      <span>·</span>
                      <Badge variant="outline" className="text-[10px]">{t.outreach_status}</Badge>
                    </div>
                    {t.phone && <div className="text-xs text-muted-foreground mt-0.5">{t.phone}</div>}
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <span className={`text-sm font-medium ${heat.color}`}>{Math.round(t.heat_score || 0)}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" title="Appeler">
                      <Phone className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-7 w-7" title="Relancer">
                      <RotateCcw className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Ignorer">
                      <XCircle className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
