/**
 * UNPRO — Carte d'entrée « Améliorer mes recommandations » (tableau de bord entrepreneur).
 */
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target } from "lucide-react";
import { useCompatibilitySnapshot } from "@/hooks/useContractorCompatibility";

export default function CompatibilityEntryCard({ contractorId }: { contractorId?: string | null }) {
  const { data } = useCompatibilitySnapshot(contractorId);
  if (!contractorId) return null;

  const pct = data?.profile?.completion_pct ?? 0;
  const completed = data?.profile?.status === "completed" && pct >= 100;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Target className="h-4 w-4 text-primary" />
            Améliorer mes recommandations
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {completed
              ? "Votre profil de compatibilité est complet. Vous pouvez l'ajuster en tout temps."
              : "Dites-nous quels projets vous voulez vraiment. 5 à 8 minutes."}
          </p>
          <div className="mt-3 max-w-xs">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Profil de compatibilité</span>
              <span>{pct}%</span>
            </div>
            <Progress value={pct} className="mt-1.5 h-1.5" />
          </div>
        </div>
        <Button asChild className="shrink-0">
          <Link to="/pro/compatibilite">{pct > 0 && !completed ? "Reprendre" : completed ? "Ajuster" : "Commencer"}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
