import ContractorLayout from "@/layouts/ContractorLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useContractorAIPPScore } from "@/hooks/useContractor";

const ProAIPPScore = () => {
  const { data: scores, isLoading } = useContractorAIPPScore();

  return (
    <ContractorLayout>
      <PageHeader title="Score AIPP" description="Votre score de performance AI-Powered" />
      {isLoading ? <LoadingState /> : !scores?.length ? (
        <EmptyState message="Aucun score AIPP disponible. Complétez votre profil et recevez des avis pour générer votre score." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {scores.map((s) => (
            <Card key={s.id}>
              <CardHeader><CardTitle className="text-base">Score AIPP</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl font-bold">{s.overall_score}</div>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
                <p className="text-xs text-muted-foreground">Calculé le {new Date(s.calculated_at).toLocaleDateString("fr-CA")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ContractorLayout>
  );
};

export default ProAIPPScore;
