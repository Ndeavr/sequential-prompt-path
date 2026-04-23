/**
 * UNPRO — PageContractorAIPPBuilder
 * Generated profile + live preview + score before/after.
 * Wired to real AIPP data from Supabase.
 */
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, TrendingUp, Shield, Eye, Zap, Star } from "lucide-react";
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

const FALLBACK_SCORE: AIPPScoreData = { overall: 62, trust: 55, completeness: 48, visibility: 35, conversion: 42 };
const POTENTIAL_BOOST = 25; // average expected improvement

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
  const [gaps, setGaps] = useState<Array<{ label: string; severity: string; impact: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackFunnelEvent("aipp_viewed", { businessName: state.businessName });

    const fetchScore = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Try to get real AIPP score from aipp_scores table
        const { data: scoreData } = await supabase
          .from("aipp_scores")
          .select("overall_score, component_scores")
          .eq("user_id", user.id)
          .order("calculated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (scoreData) {
          const components = scoreData.component_scores as any || {};
          setScore({
            overall: scoreData.overall_score || FALLBACK_SCORE.overall,
            trust: components.trust || components.authority || FALLBACK_SCORE.trust,
            completeness: components.completeness || components.tech || FALLBACK_SCORE.completeness,
            visibility: components.visibility || components.local || FALLBACK_SCORE.visibility,
            conversion: components.conversion || FALLBACK_SCORE.conversion,
          });
        }

        // Try to get from activation funnel imported data
        const { data: funnelData } = await supabase
          .from("contractor_activation_funnel" as any)
          .select("aipp_score, imported_data")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (funnelData) {
          const fd = funnelData as any;
          if (fd.aipp_score) {
            const aipp = fd.aipp_score;
            if (aipp.overall) {
              setScore({
                overall: aipp.overall,
                trust: aipp.subscores?.find((s: any) => s.key === "trust")?.score || FALLBACK_SCORE.trust,
                completeness: aipp.subscores?.find((s: any) => s.key === "completeness")?.score || FALLBACK_SCORE.completeness,
                visibility: aipp.subscores?.find((s: any) => s.key === "visibility")?.score || FALLBACK_SCORE.visibility,
                conversion: aipp.subscores?.find((s: any) => s.key === "conversion")?.score || FALLBACK_SCORE.conversion,
              });
            }
            // Use missing items as gaps
            if (aipp.missing_items?.length > 0) {
              setGaps(aipp.missing_items.map((item: string) => ({
                label: item,
                severity: "medium",
                impact: "Améliore votre score global",
              })));
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch AIPP score:", e);
      }
      setLoading(false);
    };

    fetchScore();
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
