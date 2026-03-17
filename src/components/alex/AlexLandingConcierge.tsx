/**
 * UNPRO — Alex Landing Concierge
 * Integrated Alex experience on deep link landing pages.
 * Handles: post-scan greeting, pre-login reassurance, flow guidance.
 */
import { useState, useEffect, useCallback } from "react";
import AlexConciergeOrb from "./AlexConciergeOrb";
import AlexOverlay, { type AlexAction } from "./AlexOverlay";
import AlexFlowEngine, { type AlexFeature } from "./AlexFlowEngine";
import { saveAlexResumeIntent } from "@/hooks/useAlexResume";

type AlexPhase = "idle" | "greeting" | "flow" | "pre_login";

interface AlexLandingConciergeProps {
  feature: string;
  deepLinkId?: string;
  onCtaClick: () => void;
}

const FEATURE_GREETINGS: Record<string, { message: string; sub: string }> = {
  kitchen: {
    message: "Tu veux transformer ta cuisine? Je peux t'aider en quelques secondes.",
    sub: "Design IA gratuit • Résultat instantané",
  },
  home_score: {
    message: "Je vais analyser ta maison et te donner un score personnalisé.",
    sub: "Score gratuit • Données intelligentes",
  },
  booking: {
    message: "Je vais t'aider à trouver le bon professionnel pour ton projet.",
    sub: "Matching intelligent • Sans engagement",
  },
  design: {
    message: "On va créer un design personnalisé pour ton espace.",
    sub: "Design IA gratuit • En 30 secondes",
  },
};

export default function AlexLandingConcierge({ feature, deepLinkId, onCtaClick }: AlexLandingConciergeProps) {
  const [phase, setPhase] = useState<AlexPhase>("idle");
  const [showOrb, setShowOrb] = useState(false);

  // Show orb after a short delay
  useEffect(() => {
    const t = setTimeout(() => setShowOrb(true), 1500);
    const t2 = setTimeout(() => setPhase("greeting"), 3000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  const greeting = FEATURE_GREETINGS[feature] || FEATURE_GREETINGS.design;

  const handleOrbClick = useCallback(() => {
    if (phase === "idle") setPhase("greeting");
    else if (phase === "greeting") setPhase("idle");
    else if (phase === "flow") setPhase("idle");
  }, [phase]);

  const handleStartFlow = useCallback(() => {
    const validFeatures: AlexFeature[] = ["kitchen", "home_score", "booking", "design", "energy", "maintenance"];
    if (validFeatures.includes(feature as AlexFeature)) {
      setPhase("flow");
    } else {
      handleCta();
    }
  }, [feature]);

  const handleCta = useCallback(() => {
    // Save resume intent for post-login
    saveAlexResumeIntent(feature, deepLinkId);
    setPhase("pre_login");
  }, [feature, deepLinkId]);

  const handleFlowComplete = useCallback((_context: Record<string, string>) => {
    saveAlexResumeIntent(feature, deepLinkId);
    onCtaClick();
  }, [feature, deepLinkId, onCtaClick]);

  const greetingActions: AlexAction[] = [
    { label: "Commencer", onClick: handleStartFlow },
    { label: "Voir un exemple", onClick: handleCta, variant: "outline" },
  ];

  const preLoginActions: AlexAction[] = [
    { label: "Se connecter", onClick: onCtaClick },
  ];

  return (
    <>
      {showOrb && <AlexConciergeOrb onClick={handleOrbClick} hasMessage={phase === "idle"} />}

      <AlexOverlay
        isOpen={phase === "greeting"}
        onClose={() => setPhase("idle")}
        message={greeting.message}
        subMessage={greeting.sub}
        actions={greetingActions}
      />

      <AlexOverlay
        isOpen={phase === "pre_login"}
        onClose={() => setPhase("idle")}
        message="Je te garde exactement ici. Connecte-toi et on continue."
        subMessage="Ton progrès est sauvegardé automatiquement."
        actions={preLoginActions}
      />

      {phase === "flow" && (
        <AlexFlowEngine
          feature={feature as AlexFeature}
          onComplete={handleFlowComplete}
          onDismiss={() => setPhase("idle")}
        />
      )}
    </>
  );
}
