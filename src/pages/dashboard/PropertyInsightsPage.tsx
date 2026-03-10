import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState, ErrorState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProperty } from "@/hooks/useProperties";
import { useComputedHomeScore, useComputedInsights } from "@/hooks/usePropertyInsights";
import { AlertTriangle, CheckCircle, Lightbulb, Zap, Wrench, Search } from "lucide-react";

const urgencyColors: Record<string, string> = {
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

const typeIcons: Record<string, typeof AlertTriangle> = {
  maintenance: Wrench,
  energy: Zap,
  renovation: Lightbulb,
  risk: AlertTriangle,
};

const PropertyInsightsPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: property, isLoading: pLoading, error } = useProperty(id);
  const { data: score, isLoading: sLoading } = useComputedHomeScore(id);
  const { data: insights, isLoading: iLoading } = useComputedInsights(id);

  const isLoading = pLoading || sLoading || iLoading;

  if (isLoading) return <DashboardLayout><LoadingState /></DashboardLayout>;
  if (error || !property) return <DashboardLayout><ErrorState message="Propriété introuvable." /></DashboardLayout>;

  const highCount = insights?.filter(i => i.urgency === "high").length ?? 0;
  const opportunities = insights?.filter(i => i.contractorCategory) ?? [];

  return (
    <DashboardLayout>
      <PageHeader
        title={`Intelligence propriété`}
        description={property.address}
        action={<Button asChild variant="outline"><Link to={`/dashboard/properties/${id}`}>← Retour</Link></Button>}
      />

      {/* Score Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Score maison</CardTitle></CardHeader>
          <CardContent className="text-center">
            {score ? (
              <>
                <div className={`text-5xl font-bold ${score.color}`}>{score.overall}</div>
                <p className="text-sm text-muted-foreground mt-1">/ 100</p>
                <Badge variant="secondary" className="mt-3">{score.label}</Badge>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Données insuffisantes</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Scores par catégorie</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {score ? (
              <>
                <ScoreBar label="Structure" value={score.structure} />
                <ScoreBar label="Systèmes" value={score.systems} />
                <ScoreBar label="Extérieur" value={score.exterior} />
                <ScoreBar label="Intérieur" value={score.interior} />
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Ajoutez plus de données pour voir les scores détaillés.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts summary */}
      {highCount > 0 && (
        <Card className="mb-6 border-destructive/30">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm font-medium">{highCount} élément{highCount > 1 ? "s" : ""} nécessitant une attention prioritaire</p>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader><CardTitle className="text-base">Recommandations</CardTitle></CardHeader>
          <CardContent>
            {!insights?.length ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Aucune recommandation pour le moment.</span>
              </div>
            ) : (
              <ul className="space-y-4">
                {insights.map((insight, i) => {
                  const Icon = typeIcons[insight.type] ?? Lightbulb;
                  return (
                    <li key={i} className="flex gap-3">
                      <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{insight.title}</span>
                          <Badge variant={urgencyColors[insight.urgency] as any}>{insight.urgency === "high" ? "Urgent" : insight.urgency === "medium" ? "Moyen" : "Faible"}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{insight.description}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Opportunities */}
        <Card>
          <CardHeader><CardTitle className="text-base">Opportunités d'amélioration</CardTitle></CardHeader>
          <CardContent>
            {!opportunities.length ? (
              <p className="text-sm text-muted-foreground">Aucune opportunité identifiée.</p>
            ) : (
              <ul className="space-y-3">
                {opportunities.map((o, i) => (
                  <li key={i} className="p-3 rounded-md bg-accent/50">
                    <p className="text-sm font-medium">{o.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">Type d'entrepreneur : {o.contractorCategory}</p>
                    <Button asChild variant="link" size="sm" className="px-0 mt-1">
                      <Link to={`/search?specialty=${encodeURIComponent(o.contractorCategory!)}`}>
                        <Search className="h-3 w-3 mr-1" /> Trouver un entrepreneur
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CTAs */}
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline"><Link to="/dashboard/quotes/upload">Analyser une soumission</Link></Button>
        <Button asChild variant="outline"><Link to="/search">Trouver un entrepreneur</Link></Button>
      </div>
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

export default PropertyInsightsPage;
