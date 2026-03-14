/**
 * UNPRO — Home Score Page V2
 * Full property score dashboard with:
 * - Score ring with type label (estimé/enrichi)
 * - Factor breakdown with confidence indicators
 * - Digital Twin predictions
 * - Neighborhood comparison
 * - Score history
 * French-first, mobile-first premium design.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProperties } from "@/hooks/useProperties";
import { useHomeScores } from "@/hooks/useHomeScore";
import {
  calculateHomeScore,
  getScoreTypeLabel,
  type HomeScoreInput,
  type HomeScoreOutput,
  type ScoreFactor,
} from "@/services/homeScoreService";
import { generatePredictions, type Prediction } from "@/services/property/predictionService";
import { compareWithArea, type ComparisonResult } from "@/services/property/neighborhoodService";
import ScoreRing from "@/components/ui/score-ring";
import { motion } from "framer-motion";
import {
  BarChart3, ArrowRight, Info, AlertTriangle,
  ShieldCheck, TrendingUp, MapPin, Wrench,
  Zap, Home as HomeIcon, Clock, DollarSign,
  CheckCircle, ChevronRight, Activity,
} from "lucide-react";

const HomeScorePage = () => {
  const { data: properties, isLoading: pLoading } = useProperties();
  const { data: dbScores, isLoading: sLoading } = useHomeScores();
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);

  const isLoading = pLoading || sLoading;

  const propertyScores = (properties ?? []).map((p) => {
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
    const score = calculateHomeScore(input);
    const predictions = generatePredictions({
      yearBuilt: p.year_built,
      condition: p.condition,
      squareFootage: p.square_footage,
    });
    const comparison = compareWithArea(score.overall, null, p.city || "Montréal");
    return { property: p, score, predictions, comparison };
  });

  const selected = selectedPropId
    ? propertyScores.find((ps) => ps.property.id === selectedPropId)
    : propertyScores[0];

  return (
    <DashboardLayout>
      <PageHeader
        title="Home Score"
        description="Évaluation de la condition de vos propriétés"
      />

      {isLoading ? (
        <LoadingState />
      ) : !propertyScores.length ? (
        <EmptyState
          message="Ajoutez une propriété pour voir votre score maison."
          action={
            <Button asChild className="rounded-xl">
              <Link to="/dashboard/properties/new">Ajouter une propriété</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-6 max-w-3xl">
          {/* Property Selector (if multiple) */}
          {propertyScores.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {propertyScores.map(({ property: p }) => (
                <Button
                  key={p.id}
                  variant={selectedPropId === p.id || (!selectedPropId && p.id === propertyScores[0].property.id) ? "default" : "outline"}
                  size="sm"
                  className="shrink-0"
                  onClick={() => setSelectedPropId(p.id)}
                >
                  <MapPin className="h-3.5 w-3.5 mr-1" />
                  {p.address}
                </Button>
              ))}
            </div>
          )}

          {selected && (
            <PropertyScoreDetail
              property={selected.property}
              score={selected.score}
              predictions={selected.predictions}
              comparison={selected.comparison}
              scoreHistory={dbScores}
            />
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

function PropertyScoreDetail({
  property,
  score,
  predictions,
  comparison,
  scoreHistory,
}: {
  property: any;
  score: HomeScoreOutput;
  predictions: Prediction[];
  comparison: ComparisonResult;
  scoreHistory: any[] | undefined;
}) {
  const scoreTypeInfo = getScoreTypeLabel(score.scoreType);

  return (
    <Tabs defaultValue="score" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="score">Score</TabsTrigger>
        <TabsTrigger value="predictions">Prédictions</TabsTrigger>
        <TabsTrigger value="area">Voisinage</TabsTrigger>
      </TabsList>

      {/* ─── SCORE TAB ─── */}
      <TabsContent value="score" className="space-y-4">
        {/* Main Score Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-border/50 shadow-[var(--shadow-lg)] overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-stretch">
                <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 min-w-[160px]">
                  <ScoreRing score={score.overall} size={100} label="Global" />
                  <Badge variant="secondary" className="mt-3 text-xs">
                    {scoreTypeInfo.label}
                  </Badge>
                </div>
                <div className="flex-1 p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-display text-lg font-semibold text-foreground">{property.address}</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{scoreTypeInfo.description}</p>

                  {/* Confidence bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Confiance des données</span>
                      <span className="font-medium">{score.confidenceLevel}% — {score.confidenceLabel}</span>
                    </div>
                    <Progress value={score.confidenceLevel} className="h-1.5" />
                  </div>

                  <div className="flex gap-2">
                    <Button asChild size="sm" className="gap-1">
                      <Link to={`/dashboard/properties/${property.id}/passport`}>
                        Améliorer le score <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Ce score est une <strong>estimation</strong> basée sur les informations disponibles.
            Il ne remplace pas une inspection professionnelle. Complétez votre Passeport Maison pour augmenter la précision.
          </p>
        </div>

        {/* Factor Breakdown */}
        <h3 className="font-display text-sm font-semibold text-foreground px-1">
          Détail par facteur
        </h3>
        {score.factors.map((factor, i) => (
          <FactorCard key={factor.key} factor={factor} index={i} />
        ))}

        {/* Score History */}
        {scoreHistory && scoreHistory.length > 1 && (
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Historique du score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-16">
                {scoreHistory.slice(0, 10).reverse().map((s: any, i: number) => (
                  <div
                    key={s.id}
                    className="flex-1 bg-primary/20 rounded-t transition-all"
                    style={{ height: `${(Number(s.overall_score) / 100) * 100}%` }}
                    title={`${s.overall_score} — ${new Date(s.calculated_at).toLocaleDateString("fr-CA")}`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {scoreHistory.length} évaluations enregistrées
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* ─── PREDICTIONS TAB ─── */}
      <TabsContent value="predictions" className="space-y-4">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Ces prédictions sont des <strong>estimations</strong> basées sur l'âge des composants et les données disponibles.
            Elles ne constituent pas un diagnostic professionnel.
          </p>
        </div>

        {predictions.length === 0 ? (
          <Card className="border-border/40">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Aucune prédiction de maintenance urgente. Ajoutez plus de données pour affiner l'analyse.
              </p>
            </CardContent>
          </Card>
        ) : (
          predictions.map((pred, i) => (
            <PredictionCard key={i} prediction={pred} index={i} />
          ))
        )}
      </TabsContent>

      {/* ─── AREA TAB ─── */}
      <TabsContent value="area" className="space-y-4">
        <ComparisonCard comparison={comparison} />

        {comparison.socialProofMessages.length > 0 && (
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Activité dans votre secteur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {comparison.socialProofMessages.map((msg, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {msg}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {comparison.socialProofMessages.length === 0 && (
          <Card className="border-border/40">
            <CardContent className="p-6 text-center">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Pas assez de données dans votre secteur pour une comparaison.
                Les statistiques apparaîtront lorsque plus de propriétés seront enregistrées.
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}

function FactorCard({ factor, index }: { factor: ScoreFactor; index: number }) {
  const confidenceColor = factor.confidence === "high" ? "text-success" : factor.confidence === "medium" ? "text-warning" : "text-muted-foreground";
  const confidenceLabel = factor.confidence === "high" ? "Confiance élevée" : factor.confidence === "medium" ? "Confiance moyenne" : "Confiance faible";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="border-border/40">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{factor.label}</span>
                <span className="font-display text-lg font-bold text-foreground">{factor.score}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={factor.score} className="h-1.5 flex-1" />
                <span className={`text-xs ${confidenceColor}`}>{confidenceLabel}</span>
              </div>
            </div>
          </div>

          {(factor.missingData || factor.improvementTip) && (
            <div className="mt-2 pt-2 border-t border-border/20 space-y-1">
              {factor.missingData && (
                <p className="text-xs text-warning flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {factor.missingData}
                </p>
              )}
              {factor.improvementTip && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Wrench className="h-3 w-3" /> {factor.improvementTip}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PredictionCard({ prediction, index }: { prediction: Prediction; index: number }) {
  const urgencyColors = {
    high: "border-destructive/30 bg-destructive/[0.03]",
    medium: "border-warning/30 bg-warning/[0.03]",
    low: "border-border/40",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Card className={urgencyColors[prediction.urgency]}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-sm font-medium text-foreground flex-1">{prediction.title_fr}</h4>
            <Badge variant={prediction.urgency === "high" ? "destructive" : "secondary"} className="text-xs ml-2 shrink-0">
              {prediction.probability_score}%
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">{prediction.explanation_fr}</p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> ~{prediction.predicted_year}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {prediction.cost_min.toLocaleString("fr-CA")}$ – {prediction.cost_max.toLocaleString("fr-CA")}$
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> {prediction.source_confidence === "high" ? "Haute" : prediction.source_confidence === "medium" ? "Moyenne" : "Faible"} confiance
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ComparisonCard({ comparison }: { comparison: ComparisonResult }) {
  return (
    <Card className="border-border/50 shadow-[var(--shadow-md)]">
      <CardContent className="p-5">
        <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Votre maison vs {comparison.areaLabel}
        </h3>

        {comparison.areaAvg != null ? (
          <div className="flex items-center justify-around mb-4">
            <div className="text-center">
              <ScoreRing score={comparison.yourScore} size={72} label="Vous" />
            </div>
            <div className="text-center text-muted-foreground text-xs">vs</div>
            <div className="text-center">
              <ScoreRing score={Math.round(comparison.areaAvg)} size={72} label="Secteur" />
            </div>
          </div>
        ) : null}

        <div className="text-center">
          <Badge variant={comparison.delta != null && comparison.delta >= 0 ? "default" : "secondary"}>
            {comparison.deltaLabel}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default HomeScorePage;
