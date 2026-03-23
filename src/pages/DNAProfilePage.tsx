/**
 * UNPRO — DNA Profile Page
 * Shows the user's DNA profile with traits visualization.
 * Premium, mobile-first.
 */

import { motion } from "framer-motion";
import { Brain, Sparkles, RefreshCw, ArrowRight, Loader2 } from "lucide-react";
import { useHomeownerDNA, useGenerateHomeownerDNA } from "@/hooks/useDNA";
import { useMyAlignmentAnswers } from "@/hooks/useCCAI";
import DNABadge from "@/components/dna/DNABadge";
import DNATraitsRadar from "@/components/dna/DNATraitsRadar";
import AlexExplanationBlock from "@/components/dna/AlexExplanationBlock";
import { useNavigate } from "react-router-dom";
import type { CCAIAnswer, CCAICategory } from "@/services/ccaiEngine";

const DNA_DESCRIPTIONS_FR: Record<string, string> = {
  strategist: "Vous aimez être impliqué dans les décisions, comprendre les options et planifier chaque étape.",
  delegator: "Vous préférez confier les décisions à un professionnel de confiance et suivre l'évolution à distance.",
  budget_guardian: "Le budget est votre priorité principale. Vous cherchez le meilleur rapport qualité-prix.",
  speed_seeker: "La rapidité d'exécution est cruciale pour vous. Vous valorisez l'efficacité.",
  quality_first_owner: "La qualité du travail est non-négociable. Vous êtes prêt à investir pour un résultat impeccable.",
  low_friction_owner: "Vous cherchez une expérience simple, sans friction ni complications.",
};

export default function DNAProfilePage() {
  const navigate = useNavigate();
  const { data: homeownerDNA, isLoading } = useHomeownerDNA();
  const { data: answers } = useMyAlignmentAnswers();
  const generateDNA = useGenerateHomeownerDNA();

  const handleRegenerate = () => {
    if (!answers || answers.length === 0) return;
    const ccaiAnswers: CCAIAnswer[] = answers.map((a: any) => ({
      questionCode: a.alignment_questions?.code ?? "",
      category: (a.alignment_questions?.category ?? "language_communication") as CCAICategory,
      answerCode: a.answer_code as any,
    }));
    generateDNA.mutate(ccaiAnswers);
  };

  const hasDNA = !!homeownerDNA;
  const traits = hasDNA ? (homeownerDNA.traits as Record<string, number>) : null;
  const description = hasDNA ? DNA_DESCRIPTIONS_FR[homeownerDNA.dna_type] || "" : "";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Brain className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Votre profil ADN
          </h1>
          <p className="text-sm text-muted-foreground">
            Votre profil comportemental guide nos recommandations personnalisées.
          </p>
        </motion.div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        )}

        {!isLoading && !hasDNA && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-border bg-card p-6 text-center space-y-4 shadow-[var(--shadow-lg)]"
          >
            <AlexExplanationBlock
              explanationFr="Pour créer votre profil ADN, commencez par répondre au questionnaire de compatibilité."
              subExplanationFr="Ça prend environ 3 minutes et c'est essentiel pour des recommandations justes."
            />
            <button
              onClick={() => navigate("/dashboard/alignment")}
              className="w-full rounded-2xl bg-foreground text-background py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition"
            >
              Commencer le questionnaire
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {!isLoading && hasDNA && traits && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* DNA Type Card */}
            <div className="rounded-3xl border border-border bg-card p-5 space-y-4 shadow-[var(--shadow-lg)]">
              <div className="flex items-center justify-between">
                <DNABadge
                  dnaType={homeownerDNA.dna_type}
                  dnaLabelFr={homeownerDNA.dna_label_fr}
                  confidence={homeownerDNA.confidence}
                  variant="homeowner"
                  size="lg"
                />
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">Confiance</span>
                  <div className="text-lg font-bold text-foreground">
                    {Math.round(homeownerDNA.confidence)}%
                  </div>
                </div>
              </div>

              {description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              )}
            </div>

            {/* Traits Radar */}
            <div className="rounded-3xl border border-border bg-card p-5 space-y-4 shadow-[var(--shadow-md)]">
              <h3 className="text-base font-semibold text-foreground">Vos traits comportementaux</h3>
              <DNATraitsRadar traits={traits} variant="homeowner" />
            </div>

            {/* Alex Insight */}
            <AlexExplanationBlock
              explanationFr={`En tant que "${homeownerDNA.dna_label_fr}", on cherche des entrepreneurs qui correspondent à votre style.`}
              subExplanationFr="Vos recommandations sont personnalisées en fonction de ces traits."
            />

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/matching")}
                className="flex-1 rounded-2xl bg-foreground text-background py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition"
              >
                <Sparkles className="h-4 w-4" />
                Voir mes recommandations
              </button>
              <button
                onClick={handleRegenerate}
                disabled={generateDNA.isPending}
                className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted transition disabled:opacity-50"
              >
                {generateDNA.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
