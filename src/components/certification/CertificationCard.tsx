/**
 * UNPRO — Certification Card
 * Reusable component for owner dashboard + public badge display.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { evaluateCertification, requestCertificationReview, getLatestCertification } from "@/services/property/certificationService";
import { getCertificationLabel } from "@/services/property/listingImportService";
import { Award, Shield, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

interface CertificationCardProps {
  propertyId: string;
  currentStatus?: string;
  isOwner?: boolean;
}

export default function CertificationCard({ propertyId, currentStatus, isOwner = false }: CertificationCardProps) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: evaluation } = useQuery({
    queryKey: ["certification-eval", propertyId],
    queryFn: () => evaluateCertification(propertyId),
    enabled: !!propertyId && isOwner,
  });

  const { data: certification } = useQuery({
    queryKey: ["certification", propertyId],
    queryFn: () => getLatestCertification(propertyId),
    enabled: !!propertyId,
  });

  const requestMutation = useMutation({
    mutationFn: () => requestCertificationReview(propertyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["certification", propertyId] });
      qc.invalidateQueries({ queryKey: ["certification-eval", propertyId] });
      toast({ title: "Demande envoyée ✓", description: "Votre propriété est en cours de révision." });
    },
    onError: (err: Error) => {
      toast({ title: "Non éligible", description: err.message, variant: "destructive" });
    },
  });

  const status = currentStatus || certification?.certification_status || "not_eligible";
  const label = getCertificationLabel(status);
  const isCertified = status === "certified";

  // Public badge (minimal view)
  if (!isOwner) {
    if (!isCertified) return null;
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
        <Award className="h-3.5 w-3.5" />
        Maison certifiée UnPRO
      </div>
    );
  }

  // Owner view
  return (
    <Card className={`border-border/50 ${isCertified ? "border-primary/30 bg-primary/[0.02]" : ""}`}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isCertified ? "bg-primary/10" : "bg-muted/50"}`}>
            {isCertified ? <Award className="h-5 w-5 text-primary" /> : <Shield className="h-5 w-5 text-muted-foreground" />}
          </div>
          <div className="flex-1">
            <h3 className="font-display font-semibold text-foreground">{label.label}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{label.description}</p>
          </div>
          <Badge variant={label.color}>{label.label}</Badge>
        </div>

        {evaluation && isOwner && status !== "certified" && status !== "in_review" && (
          <div className="space-y-3 pt-2 border-t border-border/40">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Passeport</span>
                <span className="font-medium text-foreground">{evaluation.passportCompletion}%</span>
              </div>
              <Progress value={evaluation.passportCompletion} className="h-1.5" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Documentation</span>
                <span className="font-medium text-foreground">{evaluation.documentQuality}%</span>
              </div>
              <Progress value={evaluation.documentQuality} className="h-1.5" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Confiance des données</span>
                <span className="font-medium text-foreground">{evaluation.dataConfidence}%</span>
              </div>
              <Progress value={evaluation.dataConfidence} className="h-1.5" />
            </div>

            {evaluation.reasons.length > 0 && (
              <ul className="space-y-1">
                {evaluation.reasons.map((r, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            )}

            {evaluation.eligible && (
              <Button
                size="sm"
                className="w-full gap-1.5"
                onClick={() => requestMutation.mutate()}
                disabled={requestMutation.isPending}
              >
                {requestMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Demander la certification
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
