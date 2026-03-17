/**
 * UNPRO — Domain Intelligence Page
 * Contractor-facing domain analysis, SEO, AISEO, authority scoring.
 */
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Globe, Shield, Search, Zap, Database, Brain, Award, ArrowRight, RefreshCw, History, Sparkles, AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ScoreRing from "@/components/ui/score-ring";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type AnalysisStep = {
  key: string;
  label: string;
  status: "pending" | "loading" | "success" | "warning" | "critical" | "partial";
};

const ANALYSIS_STEPS: AnalysisStep[] = [
  { key: "normalize", label: "Normalisation du domaine", status: "pending" },
  { key: "dns", label: "Vérification DNS", status: "pending" },
  { key: "ssl", label: "Validation SSL", status: "pending" },
  { key: "accessibility", label: "Test d'accessibilité", status: "pending" },
  { key: "seo", label: "Analyse SEO", status: "pending" },
  { key: "structured", label: "Détection des données structurées", status: "pending" },
  { key: "aiseo", label: "Analyse AISEO", status: "pending" },
  { key: "authority", label: "Calcul du score d'autorité", status: "pending" },
  { key: "recommendations", label: "Génération des correctifs", status: "pending" },
  { key: "report", label: "Rapport final", status: "pending" },
];

const stepIcon = (status: string) => {
  switch (status) {
    case "loading": return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case "success": return <CheckCircle2 className="h-4 w-4 text-success" />;
    case "warning": return <AlertTriangle className="h-4 w-4 text-accent" />;
    case "critical": return <XCircle className="h-4 w-4 text-destructive" />;
    case "partial": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    default: return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
  }
};

const StatusBadge = ({ status, label }: { status: string; label: string }) => {
  const variants: Record<string, string> = {
    live: "bg-success/10 text-success border-success/20",
    partial: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    down: "bg-destructive/10 text-destructive border-destructive/20",
    healthy: "bg-success/10 text-success border-success/20",
    active: "bg-success/10 text-success border-success/20",
    missing: "bg-destructive/10 text-destructive border-destructive/20",
    broken: "bg-destructive/10 text-destructive border-destructive/20",
    detected: "bg-primary/10 text-primary border-primary/20",
    none: "bg-muted text-muted-foreground border-border",
    likely_indexable: "bg-success/10 text-success border-success/20",
    blocked: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return (
    <Badge variant="outline" className={variants[status] || "bg-muted text-muted-foreground border-border"}>
      {label}
    </Badge>
  );
};

const ProDomainIntelligence = () => {
  const [domainInput, setDomainInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [steps, setSteps] = useState<AnalysisStep[]>([]);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("summary");

  const updateStep = (key: string, status: AnalysisStep["status"]) => {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, status } : s)));
  };

  const runAnalysis = async () => {
    if (!domainInput.trim()) return;
    setIsAnalyzing(true);
    setResult(null);
    setSteps(ANALYSIS_STEPS.map((s) => ({ ...s, status: "pending" })));

    // Simulate step progression
    const stepKeys = ANALYSIS_STEPS.map((s) => s.key);
    let currentStep = 0;

    const progressInterval = setInterval(() => {
      if (currentStep < stepKeys.length - 1) {
        updateStep(stepKeys[currentStep], "loading");
        if (currentStep > 0) updateStep(stepKeys[currentStep - 1], "success");
        currentStep++;
      }
    }, 800);

    try {
      // Get contractor_id
      const { data: { user } } = await supabase.auth.getUser();
      let contractorId: string | null = null;
      if (user) {
        const { data: contractor } = await supabase
          .from("contractors")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        contractorId = contractor?.id || null;
      }

      const { data, error } = await supabase.functions.invoke("domain-intelligence", {
        body: { domain_input: domainInput, contractor_id: contractorId },
      });

      clearInterval(progressInterval);

      if (error) throw error;

      // Mark all steps complete based on results
      setSteps((prev) =>
        prev.map((s) => ({
          ...s,
          status: data.live_status === "DOWN" && ["seo", "structured", "aiseo", "authority"].includes(s.key)
            ? "critical"
            : data.live_status === "PARTIAL" && s.key === "accessibility"
            ? "warning"
            : "success",
        }))
      );

      setResult(data);
      toast.success("Analyse terminée");
    } catch (e: any) {
      clearInterval(progressInterval);
      setSteps((prev) => prev.map((s) => (s.status === "loading" || s.status === "pending" ? { ...s, status: "critical" } : s)));
      toast.error(e.message || "Erreur lors de l'analyse");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const trustBadges = [
    { icon: Globe, label: "DNS" },
    { icon: Shield, label: "SSL" },
    { icon: Zap, label: "Accessibilité" },
    { icon: Search, label: "SEO" },
    { icon: Database, label: "Données structurées" },
    { icon: Brain, label: "AISEO" },
    { icon: Award, label: "Autorité" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Domain Intelligence | UNPRO</title>
        <meta name="description" content="Analysez votre domaine web : DNS, SSL, SEO, AISEO et score d'autorité." />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
            Domain Intelligence
          </h1>
          <p className="text-muted-foreground">
            Analyse technique, SEO et IA de votre site web
          </p>
        </div>

        {/* Input Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Analysez votre domaine
            </CardTitle>
            <CardDescription>
              Vérifiez si votre site est en ligne, bien configuré, indexable et prêt pour Google, UNPRO et les moteurs IA.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="unpro.ca, https://entreprise.com, www.monsite.ca"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && !isAnalyzing && runAnalysis()}
                disabled={isAnalyzing}
              />
              <Button onClick={runAnalysis} disabled={isAnalyzing || !domainInput.trim()} size="lg">
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyse...
                  </>
                ) : (
                  <>
                    Analyser maintenant
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-2 mt-4">
              {trustBadges.map((b) => (
                <div key={b.label} className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1">
                  <b.icon className="h-3 w-3" />
                  {b.label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Analysis Progress */}
        <AnimatePresence>
          {steps.length > 0 && !result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Analyse en cours...</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {steps.map((step, i) => (
                      <motion.div
                        key={step.key}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3"
                      >
                        {stepIcon(step.status)}
                        <span className={`text-sm ${step.status === "loading" ? "text-foreground font-medium" : step.status === "pending" ? "text-muted-foreground" : "text-foreground"}`}>
                          {step.label}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Hero Scores */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold">{result.domain?.normalized_domain}</h2>
                    <StatusBadge
                      status={result.live_status?.toLowerCase()}
                      label={result.live_status === "LIVE" ? "En ligne" : result.live_status === "PARTIAL" ? "Partiellement en ligne" : "Hors ligne"}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={runAnalysis}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Re-analyser
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="flex flex-col items-center">
                    <ScoreRing score={result.scores?.technical_score || 0} label="Technique" size={80} strokeWidth={6} />
                  </div>
                  <div className="flex flex-col items-center">
                    <ScoreRing score={result.scores?.seo_score || 0} label="SEO" size={80} strokeWidth={6} />
                  </div>
                  <div className="flex flex-col items-center">
                    <ScoreRing score={result.scores?.aiseo_score || 0} label="AISEO" size={80} strokeWidth={6} />
                  </div>
                  <div className="flex flex-col items-center">
                    <ScoreRing score={result.scores?.authority_score || 0} label="Autorité" size={80} strokeWidth={6} />
                  </div>
                  <div className="flex flex-col items-center">
                    <ScoreRing score={result.scores?.confidence_score || 0} label="Confiance" size={80} strokeWidth={6} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="summary">Résumé</TabsTrigger>
                <TabsTrigger value="technical">Technique</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
                <TabsTrigger value="ai">IA</TabsTrigger>
                <TabsTrigger value="authority">Autorité</TabsTrigger>
                <TabsTrigger value="fixes">Correctifs</TabsTrigger>
                <TabsTrigger value="seo-repair">SEO Repair</TabsTrigger>
              </TabsList>

              {/* Summary Tab */}
              <TabsContent value="summary">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* What works */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        Ce qui fonctionne
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {result.seo?.passed_checks?.map((check: string) => (
                        <div key={check} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-3 w-3 text-success flex-shrink-0" />
                          <span>{check.replace(/_/g, " ")}</span>
                        </div>
                      ))}
                      {result.dns?.status === "healthy" && (
                        <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-3 w-3 text-success" />DNS en santé</div>
                      )}
                      {result.ssl?.https_available && (
                        <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-3 w-3 text-success" />SSL actif</div>
                      )}
                    </CardContent>
                  </Card>

                  {/* What's blocking */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        Ce qui bloque
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {result.seo?.critical_issues?.map((issue: string) => (
                        <div key={issue} className="flex items-center gap-2 text-sm">
                          <XCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                          <span>{issue.replace(/_/g, " ")}</span>
                        </div>
                      ))}
                      {result.seo?.warnings?.map((w: string) => (
                        <div key={w} className="flex items-center gap-2 text-sm">
                          <AlertTriangle className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                          <span>{w.replace(/_/g, " ")}</span>
                        </div>
                      ))}
                      {result.dns?.status === "broken" && (
                        <div className="flex items-center gap-2 text-sm"><XCircle className="h-3 w-3 text-destructive" />DNS cassé</div>
                      )}
                      {!result.ssl?.https_available && (
                        <div className="flex items-center gap-2 text-sm"><XCircle className="h-3 w-3 text-destructive" />SSL manquant</div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Key cards */}
                  <Card>
                    <CardHeader><CardTitle className="text-sm">DNS</CardTitle></CardHeader>
                    <CardContent>
                      <StatusBadge status={result.dns?.status} label={result.dns?.status || "inconnu"} />
                      {result.dns?.nameserver_provider && (
                        <p className="text-xs text-muted-foreground mt-2">Provider: {result.dns.nameserver_provider}</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-sm">SSL</CardTitle></CardHeader>
                    <CardContent>
                      <StatusBadge status={result.ssl?.status} label={result.ssl?.status || "inconnu"} />
                      {result.ssl?.redirect_http_to_https && (
                        <p className="text-xs text-muted-foreground mt-2">Redirection HTTP → HTTPS active</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-sm">Hébergement</CardTitle></CardHeader>
                    <CardContent>
                      <p className="font-medium text-sm">{result.hosting?.provider || "Inconnu"}</p>
                      {result.hosting?.confidence > 0 && (
                        <p className="text-xs text-muted-foreground">Confiance: {result.hosting.confidence}%</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-sm">Données structurées</CardTitle></CardHeader>
                    <CardContent>
                      <StatusBadge status={result.structured_data?.status} label={result.structured_data?.status === "detected" ? "Détectées" : "Aucune"} />
                      {result.structured_data?.schemas_found?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {result.structured_data.schemas_found.map((s: string) => (
                            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Technical Tab */}
              <TabsContent value="technical">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">DNS Records</CardTitle></CardHeader>
                    <CardContent>
                      {result.dns?.records && Object.entries(result.dns.records).map(([type, records]: [string, any]) => (
                        <div key={type} className="mb-2">
                          <p className="text-xs font-semibold text-muted-foreground">{type}</p>
                          {Array.isArray(records) ? records.map((r: string, i: number) => (
                            <p key={i} className="text-xs font-mono">{r}</p>
                          )) : <p className="text-xs">—</p>}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-sm">Accessibilité</CardTitle></CardHeader>
                    <CardContent>
                      {result.accessibility?.variants && Object.entries(result.accessibility.variants).map(([label, v]: [string, any]) => (
                        <div key={label} className="flex items-center justify-between text-xs mb-1">
                          <span className="font-mono">{label}</span>
                          <StatusBadge status={v.reachable ? "live" : "down"} label={v.reachable ? `${v.status_code}` : "—"} />
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-sm">Indexabilité</CardTitle></CardHeader>
                    <CardContent>
                      <StatusBadge status={result.indexability?.status} label={result.indexability?.likely_indexable ? "Indexable probable" : "Bloqué"} />
                      {result.indexability?.blocking_reasons?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {result.indexability.blocking_reasons.map((r: string) => (
                            <p key={r} className="text-xs text-destructive">{r.replace(/_/g, " ")}</p>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* SEO Tab */}
              <TabsContent value="seo">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Analyse SEO — {result.scores?.seo_score || 0}/100
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {result.seo?.checks && (
                      <div className="space-y-3">
                        {Object.entries(result.seo.checks).map(([key, value]: [string, any]) => (
                          <div key={key} className="border-b border-border/50 pb-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase">{key.replace(/_/g, " ")}</p>
                            <p className="text-sm font-mono break-all">{value || "Non détecté"}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* AI Tab */}
              <TabsContent value="ai">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        AISEO — {result.aiseo?.score || 0}/100
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {result.aiseo?.strengths?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-success mb-1">Forces</p>
                          {result.aiseo.strengths.map((s: string, i: number) => (
                            <p key={i} className="text-xs text-muted-foreground">• {s}</p>
                          ))}
                        </div>
                      )}
                      {result.aiseo?.weaknesses?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-destructive mb-1">Faiblesses</p>
                          {result.aiseo.weaknesses.map((w: string, i: number) => (
                            <p key={i} className="text-xs text-muted-foreground">• {w}</p>
                          ))}
                        </div>
                      )}
                      {result.aiseo?.top_improvements?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-primary mb-1">Améliorations prioritaires</p>
                          {result.aiseo.top_improvements.map((imp: string, i: number) => (
                            <p key={i} className="text-xs text-muted-foreground">• {imp}</p>
                          ))}
                        </div>
                      )}
                      {!result.aiseo && (
                        <p className="text-sm text-muted-foreground">Analyse IA non disponible (site hors ligne ou HTML inaccessible).</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Autorité — {result.authority?.score || 0}/100
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {result.authority?.trust_strengths?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-success mb-1">Signaux de confiance</p>
                          {result.authority.trust_strengths.map((s: string, i: number) => (
                            <p key={i} className="text-xs text-muted-foreground">• {s}</p>
                          ))}
                        </div>
                      )}
                      {result.authority?.trust_gaps?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-destructive mb-1">Lacunes</p>
                          {result.authority.trust_gaps.map((g: string, i: number) => (
                            <p key={i} className="text-xs text-muted-foreground">• {g}</p>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Authority Tab */}
              <TabsContent value="authority">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 mb-6">
                      <ScoreRing score={result.authority?.score || 0} label="Autorité" size={96} />
                      <div>
                        <p className="text-sm font-semibold">
                          {(result.authority?.score || 0) >= 70 ? "Votre présence web inspire confiance." :
                           (result.authority?.score || 0) >= 40 ? "Votre présence web existe, mais certains signaux de confiance pourraient être renforcés." :
                           "Votre présence web nécessite des améliorations significatives."}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Confiance de l'analyse: {result.authority?.confidence || "inconnue"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Fixes Tab */}
              <TabsContent value="fixes">
                <div className="space-y-3">
                  {result.recommendations?.length > 0 ? (
                    result.recommendations.map((rec: any, i: number) => (
                      <Card key={i}>
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3">
                            <Badge
                              variant={rec.severity === "critical" ? "destructive" : rec.severity === "important" ? "default" : "secondary"}
                              className="text-xs mt-0.5 flex-shrink-0"
                            >
                              {rec.severity === "critical" ? "Urgent" : rec.severity === "important" ? "Important" : "Opportunité"}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold">{rec.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{rec.why_it_matters}</p>
                              <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono">
                                {rec.exact_action}
                              </div>
                              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                                <span>Impact: {rec.expected_impact}</span>
                                <span>Effort: {rec.estimated_effort}</span>
                                <Badge variant="outline" className="text-[10px]">{rec.category}</Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="pt-6 text-center text-muted-foreground">
                        {result.live_status === "DOWN"
                          ? "Le site n'est pas accessible — les correctifs détaillés ne peuvent pas être générés."
                          : "Aucun correctif prioritaire détecté."}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* SEO Repair Tab */}
              <TabsContent value="seo-repair">
                {result.homepage_seo ? (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Améliorations SEO générées par IA
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {result.homepage_seo.improved_title && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Titre suggéré</p>
                            <p className="text-sm font-mono bg-muted/50 p-2 rounded">{result.homepage_seo.improved_title}</p>
                          </div>
                        )}
                        {result.homepage_seo.improved_meta_description && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Meta description suggérée</p>
                            <p className="text-sm font-mono bg-muted/50 p-2 rounded">{result.homepage_seo.improved_meta_description}</p>
                          </div>
                        )}
                        {result.homepage_seo.improved_h1 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">H1 suggéré</p>
                            <p className="text-sm font-mono bg-muted/50 p-2 rounded">{result.homepage_seo.improved_h1}</p>
                          </div>
                        )}
                        {result.homepage_seo.intro_paragraph && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Paragraphe d'introduction</p>
                            <p className="text-sm bg-muted/50 p-3 rounded">{result.homepage_seo.intro_paragraph}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {result.homepage_seo.suggested_faqs?.length > 0 && (
                      <Card>
                        <CardHeader><CardTitle className="text-sm">FAQs suggérées</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                          {result.homepage_seo.suggested_faqs.map((faq: any, i: number) => (
                            <div key={i} className="border-b border-border/50 pb-2 last:border-0">
                              <p className="text-sm font-semibold">{faq.question}</p>
                              <p className="text-xs text-muted-foreground mt-1">{faq.answer}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {result.homepage_seo.schema_recommendations?.length > 0 && (
                      <Card>
                        <CardHeader><CardTitle className="text-sm">Schemas recommandés</CardTitle></CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {result.homepage_seo.schema_recommendations.map((s: string, i: number) => (
                              <Badge key={i} variant="outline">{s}</Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      Les améliorations SEO ne peuvent être générées que lorsque le site est accessible.
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        )}

        {/* Empty State */}
        {!isAnalyzing && !result && steps.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Globe className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Ajoutez votre site pour vérifier s'il est vraiment prêt pour vos clients, Google et les moteurs IA.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProDomainIntelligence;
