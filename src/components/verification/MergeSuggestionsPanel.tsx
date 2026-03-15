/**
 * UNPRO — Merge Suggestions Panel
 * Admin panel to review & approve/reject data suggestions from public verification.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, ArrowRight, GitMerge } from "lucide-react";
import { useReviewMergeSuggestion } from "@/hooks/useContractorVerificationIntegration";
import { toast } from "sonner";

interface Suggestion {
  id: string;
  field_name: string;
  current_value: string | null;
  suggested_value: string | null;
  source: string | null;
  confidence: number | null;
}

interface MergeSuggestionsPanelProps {
  suggestions: Suggestion[];
  contractorId: string;
  isLoading?: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  website: "Site web",
  city: "Ville",
  phone: "Téléphone",
  email: "Courriel",
  address: "Adresse",
  postal_code: "Code postal",
  specialty: "Spécialité",
  description: "Description",
  logo_url: "Logo",
};

export const MergeSuggestionsPanel = ({ suggestions, contractorId, isLoading }: MergeSuggestionsPanelProps) => {
  const reviewMutation = useReviewMergeSuggestion();

  const handleReview = async (suggestionId: string, action: "approved" | "rejected") => {
    try {
      await reviewMutation.mutateAsync({ suggestionId, contractorId, action });
      toast.success(action === "approved" ? "Suggestion appliquée" : "Suggestion rejetée");
    } catch {
      toast.error("Erreur lors du traitement");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Suggestions de mise à jour</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-16 w-full" /></CardContent>
      </Card>
    );
  }

  if (!suggestions?.length) return null;

  return (
    <Card className="border-warning/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <GitMerge className="h-4 w-4 text-warning" />
          Suggestions de mise à jour ({suggestions.length})
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Données publiques détectées. Révision admin requise avant application.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {FIELD_LABELS[s.field_name] ?? s.field_name}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground truncate">{s.current_value || "—"}</span>
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="font-medium text-foreground truncate">{s.suggested_value || "—"}</span>
              </div>
              {s.confidence != null && (
                <Badge variant="outline" className="text-[9px]">
                  Confiance : {Math.round(s.confidence * 100)}%
                </Badge>
              )}
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-success hover:bg-success/10"
                onClick={() => handleReview(s.id, "approved")}
                disabled={reviewMutation.isPending}
                title="Approuver"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                onClick={() => handleReview(s.id, "rejected")}
                disabled={reviewMutation.isPending}
                title="Rejeter"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
