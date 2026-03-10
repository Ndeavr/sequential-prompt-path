import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHomeScores } from "@/hooks/useHomeScore";

const HomeScorePage = () => {
  const { data: scores, isLoading } = useHomeScores();

  return (
    <DashboardLayout>
      <PageHeader title="Score maison" description="Évaluation de la condition de vos propriétés" />
      {isLoading ? <LoadingState /> : !scores?.length ? (
        <EmptyState message="Aucun score disponible. Les scores seront calculés automatiquement." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {scores.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <CardTitle className="text-base">{(s as any).properties?.address || "Propriété"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl font-bold">{s.overall_score}</div>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <ScoreRow label="Structure" value={s.structure_score} />
                  <ScoreRow label="Systèmes" value={s.systems_score} />
                  <ScoreRow label="Extérieur" value={s.exterior_score} />
                  <ScoreRow label="Intérieur" value={s.interior_score} />
                </div>
                {s.notes && <p className="text-sm text-muted-foreground mt-4">{s.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

const ScoreRow = ({ label, value }: { label: string; value: number | null }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-semibold">{value ?? "—"}</p>
  </div>
);

export default HomeScorePage;
