/**
 * HeroSectionImportRealtimeTerminal — Full import terminal experience.
 * Assembles the terminal viewport, reveal cards, Alex panel, and stage badge.
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FastForward, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTerminalImportAnimation, type ImportData } from "@/hooks/useTerminalImportAnimation";
import TerminalViewportGreenStream from "./TerminalViewportGreenStream";
import CardBusinessIdentityRealtime from "./CardBusinessIdentityRealtime";
import CardReviewAnalysisRealtime from "./CardReviewAnalysisRealtime";
import CardVerificationRealtime from "./CardVerificationRealtime";
import CardAIPPScoreReveal from "./CardAIPPScoreReveal";
import CardPlanRecommendationReveal from "./CardPlanRecommendationReveal";
import PanelAlexObservesImport from "./PanelAlexObservesImport";
import BadgeImportStageLive from "./BadgeImportStageLive";

interface Props {
  importData: ImportData;
  presetCode?: string;
  onPlanActivate?: (plan: string) => void;
  onComplete?: () => void;
}

export default function HeroSectionImportRealtimeTerminal({
  importData,
  presetCode = "balanced_default",
  onPlanActivate,
  onComplete,
}: Props) {
  const {
    lines, currentStage, revealedCards, isRunning, isComplete,
    elapsedMs, alexMessages, start, skip,
  } = useTerminalImportAnimation(importData, presetCode);

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center space-y-1.5 px-4">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg font-bold text-foreground"
        >
          {isComplete ? "Import terminé ✓" : "Initialisation du moteur d'importation UNPRO"}
        </motion.h2>
        <p className="text-xs text-muted-foreground">
          {isComplete
            ? "Toutes les données ont été analysées."
            : "Connexion aux signaux publics de votre entreprise. Analyse en cours."}
        </p>
      </div>

      {/* Stage badge */}
      <BadgeImportStageLive stage={currentStage} elapsedMs={elapsedMs} />

      {/* Terminal viewport */}
      <TerminalViewportGreenStream
        lines={lines}
        isRunning={isRunning}
        maxVisibleLines={10}
      />

      {/* Alex observations */}
      <PanelAlexObservesImport messages={alexMessages} />

      {/* Reveal cards */}
      <AnimatePresence>
        <div className="space-y-3">
          <CardBusinessIdentityRealtime
            data={importData}
            revealed={revealedCards.has("identity_card")}
          />
          <CardReviewAnalysisRealtime
            data={importData}
            revealed={revealedCards.has("reviews_card")}
          />
          <CardVerificationRealtime
            data={importData}
            revealed={revealedCards.has("verification_card")}
          />
          <CardAIPPScoreReveal
            data={importData}
            revealed={revealedCards.has("aipp_score_card")}
          />
          <CardPlanRecommendationReveal
            planName={importData.recommendedPlan}
            reason={importData.planReason}
            revealed={revealedCards.has("plan_card")}
            onActivate={onPlanActivate ? () => onPlanActivate(importData.recommendedPlan!) : undefined}
          />
        </div>
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 pt-2">
        {isRunning && (
          <Button
            variant="ghost"
            size="sm"
            onClick={skip}
            className="text-xs text-emerald-500/60 hover:text-emerald-400 gap-1.5"
          >
            <FastForward className="w-3.5 h-3.5" /> Passer
          </Button>
        )}
        {isComplete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={start}
            className="text-xs text-emerald-500/60 hover:text-emerald-400 gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Rejouer
          </Button>
        )}
      </div>
    </div>
  );
}
