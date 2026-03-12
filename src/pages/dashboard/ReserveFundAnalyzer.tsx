import { useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, AlertTriangle, CheckCircle2, TrendingUp,
  Shield, Sparkles, Clock, DollarSign, ArrowUp, ArrowDown, Minus,
  Loader2, Building2
} from "lucide-react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ScoreRing from "@/components/ui/score-ring";

interface Component {
  name: string;
  remaining_life_years: number;
  estimated_cost: number;
  replacement_year?: number;
  urgency: "low" | "medium" | "high" | "emergency";
  notes?: string;
}

interface ReserveFund {
  current_balance: number;
  recommended_balance: number;
  annual_contribution?: number;
  recommended_contribution?: number;
  deficit: number;
  health_score: number;
  health_status: "healthy" | "adequate" | "underfunded" | "critical";
}

interface RiskAlert {
  severity: "warning" | "critical";
  title: string;
  description: string;
}

interface MarketComparison {
  component: string;
  study_cost: number;
  market_low: number;
  market_high: number;
  status: "normal" | "overestimated" | "underestimated";
  deviation_percent: number;
}

interface Analysis {
  components: Component[];
  reserve_fund: ReserveFund;
  risk_alerts: RiskAlert[];
  recommendations: string[];
  summary: string;
  total_projected_costs_25y?: number;
  market_comparisons?: MarketComparison[];
  cost_per_unit?: Record<string, number>;
}

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.06 },
});

const urgencyConfig = {
  emergency: { label: "Urgence", variant: "destructive" as const, color: "text-destructive" },
  high: { label: "Haute", variant: "destructive" as const, color: "text-destructive" },
  medium: { label: "Moyenne", variant: "secondary" as const, color: "text-warning" },
  low: { label: "Faible", variant: "outline" as const, color: "text-success" },
};

const healthConfig = {
  healthy: { label: "Sain", color: "text-success" },
  adequate: { label: "Adéquat", color: "text-primary" },
  underfunded: { label: "Sous-financé", color: "text-warning" },
  critical: { label: "Critique", color: "text-destructive" },
};

export default function ReserveFundAnalyzer() {
  const { id: syndicateId } = useParams<{ id: string }>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [unitCount, setUnitCount] = useState(20);

  const extractTextFromFile = async (file: File): Promise<string> => {
    // For text-based extraction we read the file as text
    // PDF binary parsing happens server-side via the AI model's context
    return await file.text();
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas dépasser 20 Mo.");
      return;
    }

    setFileName(file.name);
    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const text = await extractTextFromFile(file);

      if (text.length < 100) {
        toast.error("Le contenu extrait est trop court. Assurez-vous que le PDF contient du texte lisible.");
        setIsAnalyzing(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("analyze-reserve-fund-study", {
        body: {
          document_text: text,
          syndicate_id: syndicateId || null,
          unit_count: unitCount,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        setIsAnalyzing(false);
        return;
      }

      setAnalysis(data.analysis);
      toast.success("Analyse terminée avec succès !");
    } catch (err: any) {
      console.error("Analysis error:", err);
      toast.error(err.message || "Erreur lors de l'analyse du document.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [syndicateId, unitCount]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Analyseur de fonds de prévoyance"
        description="Téléversez une étude de fonds de prévoyance pour obtenir une analyse IA complète"
      />

      {/* Upload section */}
      {!analysis && (
        <motion.div {...fadeUp(0)}>
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    <div className="text-center">
                      <p className="font-medium text-foreground">Analyse en cours...</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        L'IA analyse votre étude de fonds de prévoyance.
                        <br />Cela peut prendre 30 à 60 secondes.
                      </p>
                    </div>
                    {fileName && (
                      <Badge variant="secondary" className="gap-1">
                        <FileText className="h-3 w-3" /> {fileName}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="w-full max-w-md">
                      <label
                        htmlFor="pdf-upload"
                        className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-border/60 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
                      >
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                          <Upload className="h-7 w-7 text-primary" />
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-foreground">Téléverser une étude</p>
                          <p className="text-sm text-muted-foreground mt-1">PDF, TXT — max 20 Mo</p>
                        </div>
                      </label>
                      <input
                        id="pdf-upload"
                        type="file"
                        accept=".pdf,.txt,.text"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <label className="text-sm text-muted-foreground">Nombre d'unités :</label>
                      <input
                        type="number"
                        value={unitCount}
                        onChange={(e) => setUnitCount(parseInt(e.target.value) || 1)}
                        className="w-20 px-2 py-1 text-sm rounded-md border border-input bg-background text-foreground"
                        min={1}
                        max={500}
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence>
        {analysis && (
          <div className="space-y-6">
            {/* Summary + Score */}
            <motion.div {...fadeUp(0)}>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-start gap-5">
                    <ScoreRing
                      score={analysis.reserve_fund.health_score}
                      size={100}
                      strokeWidth={10}
                      label="Santé"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="font-display text-lg font-semibold text-foreground">Résultat de l'analyse</h2>
                        <Badge variant={analysis.reserve_fund.health_status === "healthy" ? "default" : "destructive"}>
                          {healthConfig[analysis.reserve_fund.health_status]?.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>
                      {fileName && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <FileText className="h-3 w-3" /> {fileName}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Reserve Fund Overview */}
            <motion.div {...fadeUp(1)}>
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground mb-1">Solde actuel</p>
                    <p className="text-xl font-bold text-foreground">
                      {analysis.reserve_fund.current_balance.toLocaleString("fr-CA")} $
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground mb-1">Solde recommandé</p>
                    <p className="text-xl font-bold text-success">
                      {analysis.reserve_fund.recommended_balance.toLocaleString("fr-CA")} $
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground mb-1">Déficit</p>
                    <p className={`text-xl font-bold ${analysis.reserve_fund.deficit > 0 ? "text-destructive" : "text-success"}`}>
                      {analysis.reserve_fund.deficit > 0 ? "-" : ""}{Math.abs(analysis.reserve_fund.deficit).toLocaleString("fr-CA")} $
                    </p>
                    {analysis.cost_per_unit?._deficit && analysis.reserve_fund.deficit > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {analysis.cost_per_unit._deficit.toLocaleString("fr-CA")} $ / unité
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            {/* Risk Alerts */}
            {analysis.risk_alerts.length > 0 && (
              <motion.div {...fadeUp(2)}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Alertes de risque
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysis.risk_alerts.map((alert, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border ${
                          alert.severity === "critical"
                            ? "bg-destructive/5 border-destructive/20"
                            : "bg-warning/5 border-warning/20"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={alert.severity === "critical" ? "destructive" : "secondary"} className="text-[10px]">
                            {alert.severity === "critical" ? "Critique" : "Attention"}
                          </Badge>
                          <span className="font-medium text-sm text-foreground">{alert.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Components Table */}
            <motion.div {...fadeUp(3)}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Composantes du bâtiment ({analysis.components.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.components
                      .sort((a, b) => a.remaining_life_years - b.remaining_life_years)
                      .map((comp, i) => (
                        <div key={i} className="p-3 rounded-lg border border-border/40 hover:bg-muted/20 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-sm text-foreground">{comp.name}</p>
                              {comp.notes && (
                                <p className="text-xs text-muted-foreground mt-0.5">{comp.notes}</p>
                              )}
                            </div>
                            <Badge variant={urgencyConfig[comp.urgency].variant} className="text-[10px]">
                              {urgencyConfig[comp.urgency].label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              {comp.remaining_life_years} ans
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <DollarSign className="h-3.5 w-3.5" />
                              {comp.estimated_cost.toLocaleString("fr-CA")} $
                            </span>
                            {comp.replacement_year && (
                              <span className="text-xs text-muted-foreground">
                                ~{comp.replacement_year}
                              </span>
                            )}
                          </div>
                          {/* Life remaining bar */}
                          <div className="mt-2">
                            <Progress
                              value={Math.min(comp.remaining_life_years * 4, 100)}
                              className="h-1.5"
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Market Comparisons */}
            {analysis.market_comparisons && analysis.market_comparisons.length > 0 && (
              <motion.div {...fadeUp(4)}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-secondary" />
                      Comparaison avec le marché
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysis.market_comparisons.map((mc, i) => (
                      <div key={i} className="p-3 rounded-lg border border-border/40">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm text-foreground">{mc.component}</span>
                          {mc.status === "overestimated" && (
                            <Badge variant="destructive" className="text-[10px] gap-0.5">
                              <ArrowUp className="h-3 w-3" /> Surestimé
                            </Badge>
                          )}
                          {mc.status === "underestimated" && (
                            <Badge variant="secondary" className="text-[10px] gap-0.5">
                              <ArrowDown className="h-3 w-3" /> Sous-estimé
                            </Badge>
                          )}
                          {mc.status === "normal" && (
                            <Badge variant="outline" className="text-[10px] gap-0.5">
                              <Minus className="h-3 w-3" /> Normal
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div>
                            <span>Étude: </span>
                            <span className="font-medium text-foreground">{mc.study_cost.toLocaleString("fr-CA")} $</span>
                          </div>
                          <div>
                            <span>Marché: </span>
                            <span className="font-medium text-foreground">
                              {mc.market_low.toLocaleString("fr-CA")} – {mc.market_high.toLocaleString("fr-CA")} $
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Recommendations */}
            {analysis.recommendations.length > 0 && (
              <motion.div {...fadeUp(5)}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Recommandations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* New analysis button */}
            <motion.div {...fadeUp(6)} className="flex justify-center pb-8">
              <Button
                variant="outline"
                onClick={() => { setAnalysis(null); setFileName(""); }}
                className="gap-2"
              >
                <Upload className="h-4 w-4" /> Analyser un autre document
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
