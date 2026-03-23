import { Link } from "react-router-dom";
import ContractorLayout from "@/layouts/ContractorLayout";
import { PageHeader, LoadingState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useContractorAIPPComputed } from "@/hooks/useAIPPScore";
import {
  CheckCircle, XCircle, AlertTriangle, ArrowRight,
  ShieldCheck, Eye, TrendingUp, Briefcase,
} from "lucide-react";
import AIPPScoreEvolution from "@/components/pro/AIPPScoreEvolution";

const gradeColor = (grade: string) => {
  switch (grade) {
    case "Excellent": return "text-green-600 dark:text-green-400";
    case "Bon": return "text-blue-600 dark:text-blue-400";
    case "Moyen": return "text-yellow-600 dark:text-yellow-400";
    default: return "text-red-600 dark:text-red-400";
  }
};

const importanceBadge = (imp: string) => {
  switch (imp) {
    case "high": return <Badge variant="destructive" className="text-xs">Prioritaire</Badge>;
    case "medium": return <Badge variant="secondary" className="text-xs">Recommandé</Badge>;
    default: return <Badge variant="outline" className="text-xs">Optionnel</Badge>;
  }
};

const sectionIcon = (section: string) => {
  switch (section) {
    case "trust": return <ShieldCheck className="h-4 w-4" />;
    case "visibility": return <Eye className="h-4 w-4" />;
    case "performance": return <TrendingUp className="h-4 w-4" />;
    default: return <Briefcase className="h-4 w-4" />;
  }
};

const ScoreBar = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">{icon}{label}</span>
      <span className="font-semibold">{value}%</span>
    </div>
    <Progress value={value} className="h-2" />
  </div>
);

const ProAIPPScore = () => {
  const { data: aipp, isLoading } = useContractorAIPPComputed();

  if (isLoading) return <ContractorLayout><LoadingState /></ContractorLayout>;

  if (!aipp) {
    return (
      <ContractorLayout>
        <PageHeader title="Score AIPP" description="Complétez votre profil pour générer votre score." />
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-muted-foreground">Aucun profil trouvé. Créez votre profil entrepreneur pour commencer.</p>
            <Button asChild><Link to="/pro/profile">Créer mon profil</Link></Button>
          </CardContent>
        </Card>
      </ContractorLayout>
    );
  }

  return (
    <ContractorLayout>
      <PageHeader title="Score AIPP" description="AI-Indexed Professional Profile — Votre indice de performance" />

      <div className="space-y-6">
        {/* Main score */}
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="text-center">
                <div className="text-6xl font-bold">{aipp.score}</div>
                <div className="text-sm text-muted-foreground">/ 100</div>
              </div>
              <div className="flex-1 space-y-1">
                <div className={`text-2xl font-semibold ${gradeColor(aipp.grade)}`}>{aipp.grade}</div>
                <p className="text-sm text-muted-foreground">
                  {aipp.grade === "Excellent"
                    ? "Votre profil inspire confiance et se démarque."
                    : aipp.grade === "Bon"
                    ? "Bon profil, quelques améliorations possibles."
                    : aipp.grade === "Moyen"
                    ? "Des éléments importants manquent à votre profil."
                    : "Votre profil nécessite des améliorations majeures."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscores */}
        <Card>
          <CardHeader><CardTitle className="text-base">Détail par catégorie</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <ScoreBar label="Complétude" value={aipp.completeness_score} icon={<Briefcase className="h-4 w-4" />} />
            <ScoreBar label="Confiance" value={aipp.trust_score} icon={<ShieldCheck className="h-4 w-4" />} />
            <ScoreBar label="Performance" value={aipp.performance_score} icon={<TrendingUp className="h-4 w-4" />} />
            <ScoreBar label="Visibilité" value={aipp.visibility_score} icon={<Eye className="h-4 w-4" />} />
          </CardContent>
        </Card>

        {/* Strengths */}
        {aipp.strengths.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Ce que vous faites bien</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {aipp.strengths.map((s, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Missing + weaknesses */}
        {(aipp.missing_items.length > 0 || aipp.weaknesses.length > 0) && (
          <Card>
            <CardHeader><CardTitle className="text-base">Ce qui manque à votre profil</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {aipp.weaknesses.map((w, i) => (
                  <li key={`w-${i}`} className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                    {w}
                  </li>
                ))}
                {aipp.missing_items.map((m, i) => (
                  <li key={`m-${i}`} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    {m}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Recommendations */}
        {aipp.recommendations.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Actions recommandées</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aipp.recommendations.slice(0, 8).map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                    <div className="mt-0.5 text-muted-foreground">{sectionIcon(rec.section)}</div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{rec.title}</span>
                        {importanceBadge(rec.importance)}
                      </div>
                      <p className="text-xs text-muted-foreground">{rec.description}</p>
                      <p className="text-xs text-primary font-medium">+{rec.estimatedImpact} pts estimés</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="default">
            <Link to="/pro/profile">Modifier mon profil</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/pro/documents">Mes documents</Link>
          </Button>
        </div>
      </div>
    </ContractorLayout>
  );
};

export default ProAIPPScore;
