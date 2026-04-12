/**
 * UNPRO — AIPP Analysis Loading Page
 * Immersive AI analysis loading with dynamic text and premium animation.
 * Auto-redirects to score result when analysis completes.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Wifi, BarChart3, Shield, Sparkles } from "lucide-react";
import {
  getActiveFlowSession,
  updateFlowScoreSnapshot,
  getStepRoute,
} from "@/services/flowStateService";

const STEPS = [
  { icon: Wifi, text: "Analyse de votre visibilité IA…", duration: 1200 },
  { icon: Brain, text: "Récupération des données publiques…", duration: 1400 },
  { icon: BarChart3, text: "Structuration du profil…", duration: 1000 },
  { icon: Shield, text: "Calcul du score AIPP…", duration: 800 },
  { icon: Sparkles, text: "Préparation de vos résultats…", duration: 600 },
];

export default function PageAIPPAnalysisLoading() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const session = await getActiveFlowSession("AIPP_ANALYSIS");
      const hasFallbackScore = Boolean(sessionStorage.getItem("unpro_lead_score"));

      // If no active session, still continue when fallback sessionStorage exists
      if (!session && !hasFallbackScore) {
        navigate("/entrepreneur", { replace: true });
        return;
      }
      if (session && session.step !== "loading") {
        navigate(getStepRoute(session.step), { replace: true });
        return;
      }

      // Animate through steps
      let elapsed = 0;
      const totalDuration = STEPS.reduce((s, st) => s + st.duration, 0);

      for (let i = 0; i < STEPS.length; i++) {
        if (cancelled) return;
        setCurrentStep(i);
        await new Promise((r) => setTimeout(r, STEPS[i].duration));
        elapsed += STEPS[i].duration;
        setProgress(Math.round((elapsed / totalDuration) * 100));
      }

      if (cancelled) return;

      // Read score from sessionStorage (set by landing page)
      const score = Number(sessionStorage.getItem("unpro_lead_score") || 40);
      const visibility = sessionStorage.getItem("unpro_lead_visibility") || "faible";
      const oppMin = Number(sessionStorage.getItem("unpro_lead_opp_min") || 5);
      const oppMax = Number(sessionStorage.getItem("unpro_lead_opp_max") || 15);

      if (session) {
        await updateFlowScoreSnapshot(session.id, {
          score,
          visibility,
          oppMin,
          oppMax,
        });
      }

      navigate("/aipp/local/results", { replace: true });
    };

    run();
    return () => { cancelled = true; };
  }, [navigate]);

  const StepIcon = STEPS[currentStep]?.icon || Sparkles;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Animated orb */}
        <motion.div
          className="w-32 h-32 mx-auto mb-8 relative"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.3 }}
            >
              <StepIcon className="w-12 h-12 text-primary" />
            </motion.div>
          </div>
        </motion.div>

        {/* Step text */}
        <AnimatePresence mode="wait">
          <motion.p
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-lg font-semibold text-foreground mb-6"
          >
            {STEPS[currentStep]?.text}
          </motion.p>
        </AnimatePresence>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-4">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <p className="text-sm text-muted-foreground">
          Analyse en cours… Ne fermez pas cette page.
        </p>
      </div>
    </div>
  );
}
