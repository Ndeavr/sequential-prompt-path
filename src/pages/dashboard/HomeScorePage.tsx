import { Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProperties } from "@/hooks/useProperties";
import { useHomeScores } from "@/hooks/useHomeScore";
import { calculateHomeScore, type HomeScoreInput } from "@/services/homeScoreService";
import { BarChart3 } from "lucide-react";

const HomeScorePage = () => {
  const { data: properties, isLoading: pLoading } = useProperties();
  const { data: dbScores, isLoading: sLoading } = useHomeScores();

  const isLoading = pLoading || sLoading;

  // Compute live scores for each property
  const propertyScores = (properties ?? []).map(p => {
    const input: HomeScoreInput = {
      yearBuilt: p.year_built,
      propertyType: p.property_type,
      squareFootage: p.square_footage,
      condition: p.condition,
      hasInspectionReports: false,
      uploadedDocumentCount: 0,
      quoteCount: 0,
      renovationCount: 0,
      recentRepairCount: 0,
    };
    return { property: p, score: calculateHomeScore(input) };
  });

  return (
    <DashboardLayout>
      <PageHeader title="Score maison" description="Évaluation de la condition de vos propriétés" />
      {isLoading ? <LoadingState /> : !propertyScores.length ? (
        <EmptyState
          message="Ajoutez une propriété pour voir votre score maison."
          action={<Button asChild><Link to="/dashboard/properties/new">Ajouter une propriété</Link></Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {propertyScores.map(({ property: p, score }) => (
            <Card key={p.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{p.address}</CardTitle>
                <Badge variant="secondary">{score.label}</Badge>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-5">
                  <div className={`text-4xl font-bold ${score.color}`}>{score.overall}</div>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
                <div className="space-y-3">
                  <ScoreBar label="Structure" value={score.structure} />
                  <ScoreBar label="Systèmes" value={score.systems} />
                  <ScoreBar label="Extérieur" value={score.exterior} />
                  <ScoreBar label="Intérieur" value={score.interior} />
                </div>
                <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                  <Link to={`/dashboard/properties/${p.id}/insights`}>
                    <BarChart3 className="h-4 w-4 mr-1" /> Voir les recommandations
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

const ScoreBar = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
    <Progress value={value} className="h-2" />
  </div>
);

export default HomeScorePage;
