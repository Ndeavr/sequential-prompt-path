import { Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProperties } from "@/hooks/useProperties";
import { useHomeScores } from "@/hooks/useHomeScore";
import { calculateHomeScore, type HomeScoreInput } from "@/services/homeScoreService";
import { BarChart3, ArrowRight } from "lucide-react";
import ScoreRing from "@/components/ui/score-ring";
import { motion } from "framer-motion";

const HomeScorePage = () => {
  const { data: properties, isLoading: pLoading } = useProperties();
  const { data: dbScores, isLoading: sLoading } = useHomeScores();

  const isLoading = pLoading || sLoading;

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
          action={<Button asChild className="rounded-xl"><Link to="/dashboard/properties/new">Ajouter une propriété</Link></Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {propertyScores.map(({ property: p, score }, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
            >
              <Card className="glass-card border-0 shadow-soft hover:shadow-elevation transition-shadow duration-300">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{p.address}</CardTitle>
                  <Badge variant="secondary" className="text-meta rounded-full">{score.label}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 mb-6">
                    <ScoreRing score={score.overall} size={88} label="Global" />
                    <div className="flex-1 space-y-3">
                      <ScoreBar label="Structure" value={score.structure} />
                      <ScoreBar label="Systèmes" value={score.systems} />
                      <ScoreBar label="Extérieur" value={score.exterior} />
                      <ScoreBar label="Intérieur" value={score.interior} />
                    </div>
                  </div>
                  <Button asChild variant="soft" size="sm" className="w-full rounded-xl gap-1">
                    <Link to={`/dashboard/properties/${p.id}/insights`}>
                      <BarChart3 className="h-4 w-4" /> Voir les recommandations <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

const ScoreBar = ({ label, value }: { label: string; value: number }) => {
  const color =
    value >= 70 ? "bg-success" : value >= 45 ? "bg-accent" : "bg-destructive";

  return (
    <div>
      <div className="flex justify-between text-meta mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

export default HomeScorePage;
