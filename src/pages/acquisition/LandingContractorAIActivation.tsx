/**
 * LandingContractorAIActivation — Unified acquisition + activation funnel.
 * Progressive reveal: Score → Breakdown → Before/After → Revenue → Lead Cost → Comparison → CTA.
 */
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { Helmet } from "react-helmet-async";

import {
  HeroSectionAIPPReveal,
  CardScoreAIPPBreakdown,
  CardBeforeAfterProfile,
  SliderRevenueObjectives,
  WidgetLeadCostEstimator,
  TableCompetitorComparison,
} from "@/components/contractor-acquisition";

type FunnelStep = "hero" | "results" | "objectives";

// Mock AIPP pillars
const generatePillars = (score: number) => [
  { label: "Captation intention locale", score: Math.min(15, Math.round(score * 0.15)), maxScore: 15, icon: "📍" },
  { label: "Systèmes de conversion", score: Math.min(15, Math.round(score * 0.12)), maxScore: 15, icon: "🔄" },
  { label: "Préparation IA", score: Math.min(15, Math.round(score * 0.13)), maxScore: 15, icon: "🤖" },
  { label: "SEO technique", score: Math.min(15, Math.round(score * 0.14)), maxScore: 15, icon: "🔧" },
  { label: "Qualité contenu", score: Math.min(10, Math.round(score * 0.10)), maxScore: 10, icon: "📝" },
  { label: "Preuve sociale", score: Math.min(10, Math.round(score * 0.08)), maxScore: 10, icon: "⭐" },
  { label: "Branding / UX", score: Math.min(10, Math.round(score * 0.09)), maxScore: 10, icon: "🎨" },
  { label: "Signaux de confiance", score: Math.min(10, Math.round(score * 0.07)), maxScore: 10, icon: "🛡️" },
];

const generateBeforeAfter = (score: number) => ({
  before: {
    label: "Avant UNPRO",
    score,
    items: [
      { text: "Pas de page IA optimisée", status: "bad" as const },
      { text: "Avis Google non structurés", status: "bad" as const },
      { text: "Aucune présence AEO", status: "bad" as const },
      { text: "CPC élevé — leads non qualifiés", status: "bad" as const },
      { text: "Aucun score de confiance", status: "bad" as const },
    ],
  },
  after: {
    label: "Après UNPRO",
    score: Math.min(95, score + 40),
    items: [
      { text: "Profil IA optimisé", status: "good" as const },
      { text: "Score AIPP visible", status: "good" as const },
      { text: "Matching intelligent", status: "good" as const },
      { text: "Rendez-vous garantis", status: "good" as const },
      { text: "Badge de confiance vérifié", status: "good" as const },
    ],
  },
});

export default function LandingContractorAIActivation() {
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();
  const [step, setStep] = useState<FunnelStep>("hero");
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<{
    businessName: string;
    city: string;
    score: number;
  } | null>(null);

  const handleAnalyze = useCallback(async (data: { businessName: string; city: string; website: string }) => {
    setLoading(true);
    try {
      // Generate score (mock — replace with real API)
      const score = Math.floor(Math.random() * 35) + 25;

      // Persist lead
      await supabase.from("aipp_score_checks").insert({
        business_name: data.businessName,
        city: data.city,
        website_url: data.website || null,
        quick_score: score,
        score_label: score >= 70 ? "fort" : score >= 45 ? "moyen" : "faible",
      });

      setAnalysisData({ businessName: data.businessName, city: data.city, score });
      setStep("results");
    } catch {
      toast.error("Erreur lors de l'analyse. Réessayez.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleContinueToObjectives = () => setStep("objectives");

  const handleActivate = () => {
    navigate("/entrepreneur?name=" + encodeURIComponent(analysisData?.businessName || ""));
  };

  return (
    <>
      <Helmet>
        <title>Score AIPP gratuit — Découvrez comment l'IA perçoit votre entreprise | UNPRO</title>
        <meta name="description" content="Analyse gratuite en 30 secondes. Obtenez votre score AIPP, identifiez vos lacunes et découvrez combien de revenus vous manquez chaque mois." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <AnimatePresence mode="wait">
          {/* STEP 1: Hero + Form */}
          {step === "hero" && (
            <motion.div key="hero" exit={{ opacity: 0, y: -20 }}>
              <HeroSectionAIPPReveal onAnalyze={handleAnalyze} loading={loading} />
            </motion.div>
          )}

          {/* STEP 2: Results */}
          {step === "results" && analysisData && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-4 py-8 max-w-lg mx-auto space-y-6"
            >
              {/* Score breakdown */}
              <CardScoreAIPPBreakdown
                overallScore={analysisData.score}
                pillars={generatePillars(analysisData.score)}
                businessName={analysisData.businessName}
              />

              {/* Before / After */}
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-foreground px-1">
                  Votre profil : avant vs après
                </h2>
                <CardBeforeAfterProfile {...generateBeforeAfter(analysisData.score)} />
              </div>

              {/* Lead Cost */}
              <WidgetLeadCostEstimator
                city={analysisData.city}
                appointmentsNeeded={8}
                unproPlanPrice={99}
              />

              {/* Comparison table */}
              <TableCompetitorComparison />

              {/* CTAs */}
              <div className="space-y-3 pt-2">
                <Button onClick={handleContinueToObjectives} className="w-full h-12 text-base font-semibold gap-2">
                  <Sparkles className="w-4 h-4" />
                  Calculer mes objectifs de revenus
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openAlex("general")}
                  className="w-full h-11 gap-2"
                >
                  <Mic className="w-4 h-4" />
                  Parler avec Alex
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Objectives + Plan */}
          {step === "objectives" && analysisData && (
            <motion.div
              key="objectives"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 py-8 max-w-lg mx-auto space-y-6"
            >
              <SliderRevenueObjectives />

              {/* CTA */}
              <div className="space-y-3 pt-2">
                <Button onClick={handleActivate} className="w-full h-12 text-base font-semibold gap-2">
                  <Sparkles className="w-4 h-4" />
                  Voir mon plan recommandé
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openAlex("general")}
                  className="w-full h-11 gap-2"
                >
                  <Mic className="w-4 h-4" />
                  Parler avec Alex
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
