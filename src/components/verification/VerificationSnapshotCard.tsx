/**
 * UNPRO — Verification Snapshot Card
 * Shows latest verification snapshot summary on admin contractor profile.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, AlertTriangle, TrendingDown, Clock } from "lucide-react";

interface VerificationSnapshotProps {
  snapshot: {
    identity_confidence_score: number;
    public_trust_score: number;
    live_risk_delta: number;
    identity_resolution_status: string;
    inconsistencies: unknown[];
    missing_proofs: unknown[];
    final_recommendation: string | null;
    created_at: string;
  } | null | undefined;
  isLoading?: boolean;
}

const statusLabels: Record<string, { label: string; variant: "default" | "outline" | "destructive" | "secondary" }> = {
  verified_internal_profile: { label: "Profil interne vérifié", variant: "default" },
  verified_match: { label: "Correspondance vérifiée", variant: "default" },
  probable_match_needs_more_proof: { label: "Correspondance probable", variant: "secondary" },
  ambiguous_match: { label: "Correspondance ambiguë", variant: "outline" },
  no_reliable_match: { label: "Aucune correspondance fiable", variant: "destructive" },
};

export const VerificationSnapshotCard = ({ snapshot, isLoading }: VerificationSnapshotProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Dernière vérification</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (!snapshot) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Dernière vérification</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune vérification effectuée pour cet entrepreneur.</p>
        </CardContent>
      </Card>
    );
  }

  const status = statusLabels[snapshot.identity_resolution_status] ?? { label: snapshot.identity_resolution_status, variant: "outline" as const };
  const inconsistencyCount = Array.isArray(snapshot.inconsistencies) ? snapshot.inconsistencies.length : 0;
  const missingCount = Array.isArray(snapshot.missing_proofs) ? snapshot.missing_proofs.length : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Dernière vérification
          </CardTitle>
          <Badge variant={status.variant} className="text-[10px]">{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Certitude</p>
            <p className="text-lg font-bold text-foreground">{snapshot.identity_confidence_score}%</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Confiance publique</p>
            <p className="text-lg font-bold text-foreground">{snapshot.public_trust_score}/100</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Delta risque</p>
            <p className={`text-lg font-bold ${snapshot.live_risk_delta < -10 ? "text-destructive" : snapshot.live_risk_delta < 0 ? "text-warning" : "text-success"}`}>
              {snapshot.live_risk_delta > 0 ? "+" : ""}{snapshot.live_risk_delta}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="text-sm font-medium text-foreground flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(snapshot.created_at).toLocaleDateString("fr-CA")}
            </p>
          </div>
        </div>

        {(inconsistencyCount > 0 || missingCount > 0) && (
          <div className="flex flex-wrap gap-2">
            {inconsistencyCount > 0 && (
              <Badge variant="outline" className="gap-1 text-warning border-warning/20 bg-warning/5">
                <AlertTriangle className="h-3 w-3" />
                {inconsistencyCount} incohérence{inconsistencyCount > 1 ? "s" : ""}
              </Badge>
            )}
            {missingCount > 0 && (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                {missingCount} preuve{missingCount > 1 ? "s" : ""} manquante{missingCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        )}

        {snapshot.final_recommendation && (
          <p className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3 italic">
            {snapshot.final_recommendation}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
