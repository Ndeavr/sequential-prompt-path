/**
 * UNPRO — Admin Screenshot Insights / Recommendations Page
 */
import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useScreenshotRecommendations } from "@/hooks/screenshot/useScreenshotAnalytics";
import { Lightbulb, CheckCircle2, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-muted text-muted-foreground",
};

export default function AdminScreenshotInsightsPage() {
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const { data: recs, isLoading } = useScreenshotRecommendations(filter);
  const qc = useQueryClient();

  const resolve = async (id: string) => {
    const { error } = await supabase
      .from("screenshot_recommendations")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Recommandation résolue");
    qc.invalidateQueries({ queryKey: ["screenshot_recommendations"] });
  };

  if (isLoading) return <AdminLayout><LoadingState /></AdminLayout>;

  return (
    <AdminLayout>
      <PageHeader title="Insights UX" description="Recommandations automatiques basées sur les captures" />

      <div className="flex gap-2 mb-6">
        {[undefined, "open", "resolved"].map((f) => (
          <Button
            key={f ?? "all"}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="text-xs"
          >
            {f === "open" ? "Ouvertes" : f === "resolved" ? "Résolues" : "Toutes"}
          </Button>
        ))}
      </div>

      {!recs?.length ? (
        <EmptyState message="Aucune recommandation." icon={<Lightbulb className="h-6 w-6 text-warning" />} />
      ) : (
        <div className="space-y-3">
          {recs.map((r: any) => (
            <Card key={r.id} className={`border-border/30 ${r.status === "open" ? "" : "opacity-70"}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                    <Lightbulb className="h-4 w-4 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{r.title}</span>
                      <Badge className={`text-[9px] ${PRIORITY_COLORS[r.priority] ?? ""}`}>{r.priority}</Badge>
                      <Badge variant="outline" className="text-[9px]">{r.recommendation_type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{r.description}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {r.screen_key} • {new Date(r.created_at).toLocaleString("fr-CA")}
                    </span>
                  </div>
                  {r.status === "open" && (
                    <Button variant="ghost" size="sm" onClick={() => resolve(r.id)} className="h-7 text-xs shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Fait
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
