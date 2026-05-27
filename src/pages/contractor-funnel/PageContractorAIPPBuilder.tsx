/**
 * UNPRO — PageContractorAIPPBuilder
 * Generated profile + live preview + score before/after.
 * Wired to real AIPP data from Supabase.
 */
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, TrendingUp, Shield, Eye, Zap, CheckCircle2, Loader2, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import FunnelLayout from "@/components/contractor-funnel/FunnelLayout";
import CardGlass from "@/components/unpro/CardGlass";
import { useContractorFunnel } from "@/hooks/useContractorFunnel";
import { supabase } from "@/integrations/supabase/client";
import { trackFunnelEvent } from "@/utils/trackFunnelEvent";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

interface AIPPScoreData {
  overall: number;
  trust: number;
  completeness: number;
  visibility: number;
  conversion: number;
}

type SignalState = "validated" | "processing" | "warning" | "missing";

interface ProfileSignal {
  key: string;
  label: string;
  state: SignalState;
  detail: string;
  impact: string;
}

const FALLBACK_SCORE: AIPPScoreData = { overall: 62, trust: 55, completeness: 48, visibility: 35, conversion: 42 };
const POTENTIAL_BOOST = 25;
const PHOTOS_MIN = 3;
const REVIEWS_MIN = 5;
const DESCRIPTION_MIN_CHARS = 120;


function computeAfterScore(score: AIPPScoreData): AIPPScoreData {
  return {
    overall: Math.min(100, score.overall + POTENTIAL_BOOST),
    trust: Math.min(100, score.trust + 27),
    completeness: Math.min(100, score.completeness + 43),
    visibility: Math.min(100, score.visibility + 43),
    conversion: Math.min(100, score.conversion + 43),
  };
}

export default function PageContractorAIPPBuilder() {
  const { state, goToStep } = useContractorFunnel();
  const [score, setScore] = useState<AIPPScoreData>(FALLBACK_SCORE);
  const [signals, setSignals] = useState<ProfileSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrapingRun, setScrapingRun] = useState<{ status: string; assets_detected: number; assets_validated: number; assets_rejected: number } | null>(null);

  useEffect(() => {
    trackFunnelEvent("aipp_viewed", { businessName: state.businessName });

    const fetchAll = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // 1) Score
        const { data: scoreData } = await supabase
          .from("aipp_scores")
          .select("overall_score, component_scores")
          .eq("user_id", user.id)
          .order("calculated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (scoreData) {
          const components = (scoreData.component_scores as any) || {};
          setScore({
            overall: scoreData.overall_score || FALLBACK_SCORE.overall,
            trust: components.trust || components.authority || FALLBACK_SCORE.trust,
            completeness: components.completeness || components.tech || FALLBACK_SCORE.completeness,
            visibility: components.visibility || components.local || FALLBACK_SCORE.visibility,
            conversion: components.conversion || FALLBACK_SCORE.conversion,
          });
        }

        // 2) Contractor record (real data — logo_url, description, rbq, rating, review_count)
        const { data: contractor } = await supabase
          .from("contractors")
          .select("id, logo_url, description, rbq_number, rating, review_count, website")
          .eq("user_id", user.id)
          .maybeSingle();

        // 3) Media count (real)
        let mediaCount = 0;
        let assetsDetected = 0;
        let assetsValidated = 0;
        let assetsRejected = 0;
        let runStatus: string | null = null;

        if (contractor?.id) {
          const { count: mc } = await supabase
            .from("contractor_media")
            .select("id", { count: "exact", head: true })
            .eq("contractor_id", contractor.id);
          mediaCount = mc ?? 0;

          // 4) Latest scraping run (detected vs validated split)
          const { data: run } = await supabase
            .from("contractor_scraping_runs" as any)
            .select("status, assets_detected, assets_validated, assets_rejected")
            .eq("contractor_id", contractor.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (run) {
            const r = run as any;
            runStatus = r.status;
            assetsDetected = r.assets_detected ?? 0;
            assetsValidated = r.assets_validated ?? 0;
            assetsRejected = r.assets_rejected ?? 0;
            setScrapingRun({
              status: r.status,
              assets_detected: assetsDetected,
              assets_validated: assetsValidated,
              assets_rejected: assetsRejected,
            });
          }
        }

        // 5) Derive coherent signals (no hardcoded lies)
        const pipelineRunning = runStatus !== null && runStatus !== "completed" && runStatus !== "failed";

        const computedSignals: ProfileSignal[] = [];

        // — Logo
        if (contractor?.logo_url) {
          computedSignals.push({
            key: "logo",
            label: "Logo",
            state: "validated",
            detail: "Logo validé",
            impact: "Identité visuelle reconnue",
          });
        } else if (pipelineRunning) {
          computedSignals.push({
            key: "logo",
            label: "Logo",
            state: "processing",
            detail: "Logo détecté — optimisation en cours",
            impact: "Validation IA en cours",
          });
        } else {
          computedSignals.push({
            key: "logo",
            label: "Logo",
            state: "missing",
            detail: "Aucun logo trouvé",
            impact: "Réduit la crédibilité de 20%",
          });
        }

        // — Photos
        if (mediaCount >= PHOTOS_MIN) {
          computedSignals.push({
            key: "photos",
            label: "Photos",
            state: "validated",
            detail: `${mediaCount} photos validées`,
            impact: "Boost conversion +15%",
          });
        } else if (assetsDetected > mediaCount || pipelineRunning) {
          computedSignals.push({
            key: "photos",
            label: "Photos",
            state: "processing",
            detail: `${assetsDetected} détectées — validation en cours`,
            impact: "Classification IA en cours",
          });
        } else if (mediaCount > 0) {
          computedSignals.push({
            key: "photos",
            label: "Photos",
            state: "warning",
            detail: `Seulement ${mediaCount}/${PHOTOS_MIN} photos validées`,
            impact: "Réduit la conversion de 15%",
          });
        } else {
          computedSignals.push({
            key: "photos",
            label: "Photos",
            state: "missing",
            detail: "Aucune photo trouvée",
            impact: "Réduit la conversion de 15%",
          });
        }

        // — Description
        const descLen = contractor?.description?.length ?? 0;
        computedSignals.push(
          descLen >= DESCRIPTION_MIN_CHARS
            ? { key: "description", label: "Description", state: "validated", detail: `${descLen} caractères`, impact: "Bien indexée par les IA" }
            : descLen > 0
            ? { key: "description", label: "Description", state: "warning", detail: `Trop courte (${descLen} car.)`, impact: "Réduit le SEO de 10%" }
            : { key: "description", label: "Description", state: "missing", detail: "Description absente", impact: "Réduit le SEO de 10%" },
        );

        // — RBQ
        computedSignals.push(
          contractor?.rbq_number
            ? { key: "rbq", label: "Licence RBQ", state: "validated", detail: contractor.rbq_number, impact: "Confiance +25 points" }
            : { key: "rbq", label: "Licence RBQ", state: "missing", detail: "Licence non renseignée", impact: "Confiance -25 points" },
        );

        // — Reviews
        const rc = contractor?.review_count ?? 0;
        computedSignals.push(
          rc >= REVIEWS_MIN
            ? { key: "reviews", label: "Avis clients", state: "validated", detail: `${rc} avis · ${contractor?.rating ?? "-"}★`, impact: "Preuve sociale forte" }
            : rc > 0
            ? { key: "reviews", label: "Avis clients", state: "warning", detail: `Seulement ${rc} avis`, impact: "Preuve sociale faible" }
            : { key: "reviews", label: "Avis clients", state: "missing", detail: "Aucun avis importé", impact: "Preuve sociale absente" },
        );

        setSignals(computedSignals);
      } catch (e) {
        console.error("Failed to fetch AIPP data:", e);
      }
      setLoading(false);
    };

    fetchAll();
  }, [state.businessName]);

  const afterScore = computeAfterScore(score);


  const displayGaps = gaps.length > 0 ? gaps : [
    { label: "Logo manquant", severity: "high", impact: "Réduit la crédibilité de 20%" },
    { label: "Moins de 3 photos", severity: "medium", impact: "Réduit la conversion de 15%" },
    { label: "Aucune FAQ", severity: "medium", impact: "Réduit la visibilité IA de 25%" },
    { label: "Description courte absente", severity: "low", impact: "Réduit le SEO de 10%" },
  ];

  const radarData = [
    { axis: "Identité", before: score.trust, after: afterScore.trust },
    { axis: "Conformité", before: Math.round(score.trust * 0.8), after: Math.round(afterScore.trust * 0.95) },
    { axis: "Contenu", before: score.completeness, after: afterScore.completeness },
    { axis: "Preuve sociale", before: Math.round(score.trust * 0.9), after: Math.round(afterScore.trust * 0.9) },
    { axis: "Visuel", before: Math.round(score.completeness * 0.6), after: Math.round(afterScore.completeness * 0.85) },
    { axis: "Spécialisation", before: score.conversion, after: afterScore.conversion },
    { axis: "Territoire", before: score.visibility, after: afterScore.visibility },
    { axis: "Convertibilité", before: score.conversion, after: afterScore.conversion },
  ];

  return (
    <>
      <Helmet>
        <title>Profil AIPP — {state.businessName || "Score"} | UNPRO</title>
      </Helmet>

      <FunnelLayout currentStep="aipp_builder" width="wide">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Left: Score & Radar ─── */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial="hidden" animate="visible" variants={fadeUp}>
              <h2 className="text-xl font-bold font-display text-foreground mb-1">
                Profil AIPP de {state.businessName || "votre entreprise"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {loading ? "Chargement du score..." : "Score calculé à partir des données importées"}
              </p>
            </motion.div>

            {/* Score Before/After */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="grid grid-cols-2 gap-4"
            >
              <CardGlass noAnimation>
                <motion.div variants={fadeUp} className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Score actuel</p>
                  <p className="text-4xl font-bold font-display text-warning">{score.overall}</p>
                  <p className="text-xs text-muted-foreground mt-1">/ 100</p>
                </motion.div>
              </CardGlass>
              <CardGlass noAnimation elevated>
                <motion.div variants={fadeUp} className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Score potentiel</p>
                  <p className="text-4xl font-bold font-display text-success">{afterScore.overall}</p>
                  <p className="text-xs text-success mt-1">+{afterScore.overall - score.overall} points</p>
                </motion.div>
              </CardGlass>
            </motion.div>

            {/* Score breakdown */}
            <CardGlass noAnimation>
              <h3 className="text-sm font-semibold text-foreground mb-4">Décomposition du score</h3>
              <div className="space-y-3">
                {[
                  { label: "Confiance", icon: Shield, before: score.trust, after: afterScore.trust },
                  { label: "Complétude", icon: Zap, before: score.completeness, after: afterScore.completeness },
                  { label: "Visibilité", icon: Eye, before: score.visibility, after: afterScore.visibility },
                  { label: "Conversion", icon: TrendingUp, before: score.conversion, after: afterScore.conversion },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-foreground w-20">{item.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                        initial={{ width: 0 }}
                        animate={{ width: `${item.before}%` }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                      />
                    </div>
                    <span className="text-xs font-medium text-foreground w-8">{item.before}</span>
                    <span className="text-xs text-success">→ {item.after}</span>
                  </div>
                ))}
              </div>
            </CardGlass>

            {/* Radar Chart */}
            <CardGlass noAnimation>
              <h3 className="text-sm font-semibold text-foreground mb-4">Radar de complétude</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="axis" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    <Radar name="Avant" dataKey="before" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.1} />
                    <Radar name="Après" dataKey="after" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 rounded-full bg-warning" />
                  <span className="text-xs text-muted-foreground">Avant</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 rounded-full bg-primary" />
                  <span className="text-xs text-muted-foreground">Après complétion</span>
                </div>
              </div>
            </CardGlass>
          </div>

          {/* ─── Right: Gaps & Actions ─── */}
          <div className="space-y-4">
            <CardGlass noAnimation className="sticky top-24">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Star className="h-4 w-4 text-warning" />
                Éléments manquants
              </h3>
              <div className="space-y-3">
                {displayGaps.map((gap, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                    <div
                      className={`w-2 h-2 rounded-full mt-1 ${
                        gap.severity === "high" ? "bg-destructive" : gap.severity === "medium" ? "bg-warning" : "bg-muted-foreground"
                      }`}
                    />
                    <div>
                      <p className="text-xs font-medium text-foreground">{gap.label}</p>
                      <p className="text-xs text-muted-foreground">{gap.impact}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-2">
                <Button
                  className="w-full h-12 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-[var(--shadow-glow)]"
                  onClick={() => goToStep("assets_studio")}
                >
                  Compléter mon profil
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="w-full h-10 rounded-xl text-xs text-muted-foreground"
                  onClick={() => goToStep("plan_recommendation")}
                >
                  Passer aux plans →
                </Button>
              </div>
            </CardGlass>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button variant="ghost" onClick={() => goToStep("import_workspace")} className="text-sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'import
          </Button>
        </div>
      </FunnelLayout>
    </>
  );
}
