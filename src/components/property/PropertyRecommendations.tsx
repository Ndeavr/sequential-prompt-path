import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PropertyRecommendation } from "@/types/property";
import { formatCurrency } from "@/types/property";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, Zap, UserSearch, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const PRIORITY_CONFIG: Record<string, { color: string; icon: typeof Zap }> = {
  urgent: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: Zap },
  high: { color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: AlertTriangle },
  medium: { color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Clock },
  low: { color: "bg-primary/10 text-primary border-primary/20", icon: CheckCircle },
};

export default function PropertyRecommendations({
  items,
  propertyId,
}: {
  items: PropertyRecommendation[];
  propertyId?: string;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadingRecId, setLoadingRecId] = useState<string | null>(null);

  async function handleFindContractor(rec: PropertyRecommendation) {
    if (!user || !propertyId) {
      toast.error("Veuillez vous connecter pour continuer");
      return;
    }

    setLoadingRecId(rec.id);

    try {
      // 1. Get property for city info
      const { data: property } = await supabase
        .from("properties")
        .select("city")
        .eq("id", propertyId)
        .single();

      // 2. Create lead
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .insert({
          owner_profile_id: user.id,
          property_id: propertyId,
          lead_type: "contractor",
          city: property?.city ?? null,
          intent: "improve_home",
          project_category: rec.category,
          specialty_needed: rec.recommended_profession ?? rec.category,
          budget_min: rec.estimated_cost_min ?? null,
          budget_max: rec.estimated_cost_max ?? null,
          urgency: rec.priority === "urgent" ? "urgent" : rec.priority === "high" ? "high" : "medium",
          language: "fr",
          seriousness_score: rec.priority === "urgent" ? 90 : rec.priority === "high" ? 78 : 65,
          matching_status: "pending",
          payload: {
            source: "property_recommendation",
            recommendation_id: rec.id,
            recommendation_title: rec.title,
          },
        })
        .select("id")
        .single();

      if (leadError || !lead) {
        throw new Error(leadError?.message ?? "Erreur lors de la création du lead");
      }

      // 3. Invoke matching engine
      const { data: matchResult, error: matchError } = await supabase.functions.invoke("match-lead", {
        body: { leadId: lead.id },
      });

      if (matchError) {
        console.warn("Matching error (non-blocking):", matchError);
        // Still redirect — the lead is created, matching can be retried
      }

      const matchCount = matchResult?.matches_count ?? 0;
      toast.success(
        matchCount > 0
          ? `${matchCount} entrepreneur${matchCount > 1 ? "s" : ""} trouvé${matchCount > 1 ? "s" : ""} !`
          : "Lead créé — recherche d'entrepreneurs en cours"
      );

      // 4. Redirect to results
      navigate(`/dashboard/leads/${lead.id}/results`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inattendue";
      toast.error(msg);
    } finally {
      setLoadingRecId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card p-5">
        <h3 className="text-sm font-medium text-foreground mb-2">Recommandations</h3>
        <p className="text-sm text-muted-foreground">
          Aucune recommandation pour le moment. Complétez votre dossier pour recevoir des suggestions.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">Recommandations</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Priorités suggérées</p>
        </div>
        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const config = PRIORITY_CONFIG[item.priority ?? "medium"] ?? PRIORITY_CONFIG.medium;
          const Icon = config.icon;
          const isLoading = loadingRecId === item.id;

          return (
            <div key={item.id} className="rounded-xl border border-border/30 bg-background/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.color.split(" ")[1]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs text-primary font-medium">{item.category}</span>
                      <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                        {item.priority ?? "medium"}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-sm text-foreground">{item.title}</h4>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {item.recommended_timeline && (
                  <span className="rounded-md bg-muted/40 px-2 py-1 text-muted-foreground">
                    ⏱ {item.recommended_timeline}
                  </span>
                )}
                {item.recommended_profession && (
                  <span className="rounded-md bg-muted/40 px-2 py-1 text-muted-foreground">
                    👷 {item.recommended_profession}
                  </span>
                )}
                {(item.estimated_cost_min != null || item.estimated_cost_max != null) && (
                  <span className="rounded-md bg-muted/40 px-2 py-1 text-muted-foreground">
                    💰 {formatCurrency(item.estimated_cost_min)} — {formatCurrency(item.estimated_cost_max)}
                  </span>
                )}
              </div>

              {/* CTA: Trouver un entrepreneur */}
              <div className="mt-3 pt-3 border-t border-border/20">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  disabled={isLoading || !!loadingRecId}
                  onClick={() => handleFindContractor(item)}
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <UserSearch className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {isLoading ? "Recherche en cours…" : "Trouver un entrepreneur"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}