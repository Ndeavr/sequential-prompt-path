/**
 * UNPRO — « À prévoir pour votre maison »
 * Reuses property_recommendations. Every suggestion shows its real basis and
 * certainty level. Nothing is invented: without data, we say « À confirmer ».
 * Confirming a job writes into property_events (existing history), never a parallel store.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProvenanceBadge from "./ProvenanceBadge";
import AddDocumentDialog from "./AddDocumentDialog";
import { trackMaintenanceCompleted } from "@/services/eventTrackingService";
import { CalendarClock, CheckCircle2, Paperclip } from "lucide-react";

interface Props {
  propertyId: string;
}

interface Reco {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string | null;
  recommended_timeline: string | null;
  source: string | null;
  reasoning: Record<string, unknown> | null;
}

function basisLabel(reco: Reco): string | null {
  const r = (reco.reasoning ?? {}) as Record<string, unknown>;
  const basis = (r.basis ?? r.reason ?? r.explanation) as string | undefined;
  if (basis) return `Suggestion basée sur : ${basis}`;
  if (reco.source) return `Suggestion basée sur : ${reco.source}`;
  return null;
}

export default function UpcomingMaintenanceCard({ propertyId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [proofFor, setProofFor] = useState<Reco | null>(null);

  const { data: recos, isLoading } = useQuery({
    queryKey: ["property-recommendations", propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_recommendations")
        .select("id, title, description, category, priority, recommended_timeline, source, reasoning")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as unknown as Reco[];
    },
  });

  const confirmDone = useMutation({
    mutationFn: async (reco: Reco) => {
      const { error } = await supabase.from("property_events").insert({
        property_id: propertyId,
        user_id: user!.id,
        event_type: "maintenance",
        title: reco.title,
        description: reco.description,
        event_date: new Date().toISOString().slice(0, 10),
        provenance: "declared",
        metadata: { confirmed_from_recommendation: reco.id },
      } as never);
      if (error) throw error;
      await trackMaintenanceCompleted(propertyId, reco.category, user!.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["property-story", propertyId] });
      qc.invalidateQueries({ queryKey: ["property-events", propertyId] });
      toast({ title: "Ajouté à l'histoire de votre maison ✓" });
    },
    onError: () =>
      toast({
        title: "Impossible d'enregistrer pour l'instant",
        description: "Réessayez dans un instant.",
        variant: "destructive",
      }),
  });

  if (isLoading) return <div className="h-28 animate-pulse rounded-xl bg-muted/30" />;

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 text-primary" />
            À prévoir pour votre maison
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(!recos || recos.length === 0) && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Pas encore assez d'information pour suggérer des entretiens. Ajoutez une inspection, une
              facture ou une rénovation : les suggestions apparaîtront à mesure que l'histoire de votre
              maison se construit.
            </p>
          )}

          {recos?.map((reco) => {
            const basis = basisLabel(reco);
            return (
              <div key={reco.id} className="rounded-xl border border-border/40 bg-card/60 p-3">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <ProvenanceBadge provenance={basis ? "inferred" : "unconfirmed"} />
                  {reco.recommended_timeline && (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      {reco.recommended_timeline}
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground">{reco.title}</p>
                {reco.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{reco.description}</p>
                )}
                <p className="mt-1 text-[11px] italic text-muted-foreground">
                  {basis ?? "Information insuffisante — à confirmer avec vos documents."}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1 text-xs"
                    onClick={() => confirmDone.mutate(reco)}
                    disabled={confirmDone.isPending}
                  >
                    <CheckCircle2 className="h-3 w-3" /> J'ai déjà fait cet entretien
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 gap-1 text-xs"
                    onClick={() => setProofFor(reco)}
                  >
                    <Paperclip className="h-3 w-3" /> Ajouter une preuve d'entretien
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <AddDocumentDialog
        open={!!proofFor}
        onOpenChange={(o) => !o && setProofFor(null)}
        propertyId={propertyId}
      />
    </>
  );
}
