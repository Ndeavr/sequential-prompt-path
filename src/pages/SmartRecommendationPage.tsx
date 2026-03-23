/**
 * UNPRO — Smart Recommendation Page
 * Premium mobile-first page showing the BEST match for the user.
 * Never shows a list first. Shows ONE recommendation with full context.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, ChevronDown, Brain, Loader2 } from "lucide-react";
import { useMatchResults } from "@/hooks/useMatchingEngine";
import { useHomeownerDNA } from "@/hooks/useDNA";
import { useCCAIScore } from "@/hooks/useCCAI";
import SmartRecommendationCard from "@/components/dna/SmartRecommendationCard";
import CompatibilityBreakdownCard from "@/components/dna/CompatibilityBreakdownCard";
import AlexExplanationBlock from "@/components/dna/AlexExplanationBlock";
import DNABadge from "@/components/dna/DNABadge";
import DNATraitsRadar from "@/components/dna/DNATraitsRadar";
import { useNavigate } from "react-router-dom";

// ─── States ───
type PageState = "loading" | "dna_missing" | "dna_partial" | "matching_ready" | "no_results";

export default function SmartRecommendationPage() {
  const navigate = useNavigate();
  const { data: matchResults, isLoading: matchLoading } = useMatchResults();
  const { data: homeownerDNA, isLoading: dnaLoading } = useHomeownerDNA();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const isLoading = matchLoading || dnaLoading;

  const getState = (): PageState => {
    if (isLoading) return "loading";
    if (!homeownerDNA) return "dna_missing";
    if ((homeownerDNA.confidence ?? 0) < 50) return "dna_partial";
    if (!matchResults || matchResults.length === 0) return "no_results";
    return "matching_ready";
  };

  const state = getState();
  const bestMatch = matchResults?.[0];
  const alternatives = matchResults?.slice(1, 4) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 border border-primary/15 px-3 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Recommandation intelligente
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Le meilleur choix pour vous
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Basé sur votre profil, vos priorités et votre projet.
          </p>
        </motion.div>

        {/* DNA status */}
        {homeownerDNA && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center"
          >
            <DNABadge
              dnaType={homeownerDNA.dna_type}
              dnaLabelFr={homeownerDNA.dna_label_fr}
              confidence={homeownerDNA.confidence}
              variant="homeowner"
            />
          </motion.div>
        )}

        {/* State: Loading */}
        <AnimatePresence mode="wait">
          {state === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-16"
            >
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Analyse en cours…</p>
            </motion.div>
          )}

          {/* State: DNA Missing */}
          {state === "dna_missing" && (
            <motion.div
              key="dna_missing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-3xl border border-border bg-card p-6 text-center space-y-4 shadow-[var(--shadow-lg)]"
            >
              <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Brain className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Créons votre profil ADN</h2>
              <p className="text-sm text-muted-foreground">
                Répondez à quelques questions pour que nous puissions trouver l'entrepreneur qui correspond le mieux à vos attentes.
              </p>
              <button
                onClick={() => navigate("/dashboard/alignment")}
                className="w-full rounded-2xl bg-foreground text-background py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition"
              >
                Commencer le questionnaire
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {/* State: DNA Partial */}
          {state === "dna_partial" && (
            <motion.div
              key="dna_partial"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <AlexExplanationBlock
                explanationFr="Votre profil est en cours de construction. Complétez quelques questions supplémentaires pour des recommandations plus précises."
                subExplanationFr="Plus votre profil est complet, plus la recommandation est juste."
              />
              <button
                onClick={() => navigate("/dashboard/alignment")}
                className="w-full rounded-2xl border border-border bg-card py-3 text-sm font-semibold text-foreground hover:bg-muted transition"
              >
                Compléter mon profil ADN
              </button>
            </motion.div>
          )}

          {/* State: No Results */}
          {state === "no_results" && (
            <motion.div
              key="no_results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-3xl border border-border bg-card p-6 text-center space-y-3"
            >
              <p className="text-lg font-semibold text-foreground">Aucun match disponible</p>
              <p className="text-sm text-muted-foreground">
                Nous n'avons pas encore trouvé d'entrepreneur correspondant à votre profil pour le moment. Revenez bientôt!
              </p>
            </motion.div>
          )}

          {/* State: Matching Ready — THE recommendation */}
          {state === "matching_ready" && bestMatch && (
            <motion.div
              key="matching_ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <SmartRecommendationCard
                contractorName={bestMatch.business_name || "Entrepreneur"}
                specialty={bestMatch.specialty || ""}
                city={bestMatch.city || ""}
                logoUrl={bestMatch.logo_url || undefined}
                rating={bestMatch.rating || 0}
                reviewCount={bestMatch.review_count || 0}
                verified={bestMatch.verification_status === "verified"}
                yearsExperience={bestMatch.years_experience || 0}
                recommendationScore={bestMatch.recommendation_score}
                ccaiScore={bestMatch.ccai_score}
                dnaFitScore={bestMatch.dna_fit_score}
                aippScore={bestMatch.aipp_score_snapshot}
                contractorDnaLabelFr="Artisan premium"
                contractorDnaType="premium_craftsman"
                homeownerDnaLabelFr={homeownerDNA?.dna_label_fr || "Propriétaire"}
                topReasonsFr={
                  bestMatch.explanations?.top_reasons?.map((r: any) => r.text_fr) || [
                    "Correspond à vos priorités",
                    "Expérience solide dans votre secteur",
                  ]
                }
                watchoutsFr={bestMatch.explanations?.watchouts?.map((w: any) => w.text_fr)}
                alexExplanationFr={`C'est le meilleur choix pour vous. Il correspond à vos priorités et votre style.`}
                onBooking={() => navigate(`/booking/${bestMatch.contractor_id}`)}
                onDetails={() => setShowBreakdown(!showBreakdown)}
              />

              {/* Compatibility breakdown toggle */}
              <AnimatePresence>
                {showBreakdown && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <CompatibilityBreakdownCard
                      categoryScores={[
                        { category: "language_communication", matched: 4, total: 6, percent: 67 },
                        { category: "involvement_complexity", matched: 4, total: 5, percent: 80 },
                        { category: "scale_environment", matched: 3, total: 5, percent: 60 },
                        { category: "trust_values", matched: 4, total: 5, percent: 80 },
                        { category: "professional_boundaries", matched: 3, total: 4, percent: 75 },
                      ]}
                      strengthsFr={[
                        "Style de communication aligné",
                        "Priorités budget compatibles",
                        "Niveau d'implication compatible",
                      ]}
                      watchoutsFr={["Différence mineure sur la tolérance au bruit"]}
                      recommendationFr="Bonne compatibilité globale, avec quelques écarts mineurs."
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Alternatives */}
              {alternatives.length > 0 && (
                <div className="space-y-3">
                  <button
                    onClick={() => setShowAlternatives(!showAlternatives)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition"
                  >
                    {showAlternatives ? "Masquer" : "Voir"} {alternatives.length} autres options
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${showAlternatives ? "rotate-180" : ""}`}
                    />
                  </button>

                  <AnimatePresence>
                    {showAlternatives && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                      >
                        {alternatives.map((alt, i) => (
                          <motion.div
                            key={alt.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4"
                          >
                            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                              <span className="text-sm font-bold text-muted-foreground">
                                {(alt.business_name || "?").charAt(0)}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {alt.business_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                URS {alt.recommendation_score} · CCAI {alt.ccai_score}%
                              </p>
                            </div>
                            <button
                              onClick={() => navigate(`/booking/${alt.contractor_id}`)}
                              className="shrink-0 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition"
                            >
                              Voir
                            </button>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
