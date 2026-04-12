/**
 * UNPRO — PageAIPPScoreReveal
 * /aipp/:token/results — Progressive score reveal with Alex narration.
 */
import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RotateCcw, ArrowRight, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useScoreRevealEngine } from "@/hooks/useScoreRevealEngine";
import { getQuickWins, getMainWeakness, getDefaultDimensions } from "@/services/scoreRevealService";

import BadgeRevealStage from "@/components/score-reveal/BadgeRevealStage";
import CardScoreRevealSuspense from "@/components/score-reveal/CardScoreRevealSuspense";
import CardAIPPScoreHeroReveal from "@/components/score-reveal/CardAIPPScoreHeroReveal";
import CardAIPPInterpretationInstant from "@/components/score-reveal/CardAIPPInterpretationInstant";
import CardAIPPWeaknessHighlight from "@/components/score-reveal/CardAIPPWeaknessHighlight";
import CardAIPPQuickWin from "@/components/score-reveal/CardAIPPQuickWin";
import WidgetAIPPDimensionBarsAnimated from "@/components/score-reveal/WidgetAIPPDimensionBarsAnimated";
import PanelAlexTranscriptLive from "@/components/score-reveal/PanelAlexTranscriptLive";
import UnproLogo from "@/components/brand/UnproLogo";

interface SessionData {
  id: string;
  score_global: number;
  business_name?: string;
}

export default function PageAIPPScoreReveal() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Load session from DB or sessionStorage fallback
  useEffect(() => {
    async function load() {
      // Try DB first
      if (token && token !== "local") {
        const { data } = await supabase
          .from("alex_score_reveal_sessions")
          .select("id, score_global")
          .eq("session_token", token)
          .maybeSingle();

        if (data) {
          setSession({ id: data.id, score_global: data.score_global });
          setLoading(false);
          return;
        }
      }

      // Fallback to sessionStorage
      const storedScore = sessionStorage.getItem("unpro_lead_score");
      if (storedScore) {
        setSession({
          id: "",
          score_global: Number(storedScore) || 45,
          business_name: sessionStorage.getItem("unpro_lead_business") || undefined,
        });
        setLoading(false);
        return;
      }

      setError(true);
      setLoading(false);
    }
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </motion.div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <p className="text-lg font-semibold text-foreground mb-2">Session introuvable</p>
        <p className="text-sm text-muted-foreground mb-4">Ce lien n'est plus valide ou a expiré.</p>
        <Button onClick={() => navigate("/entrepreneur")} variant="default">
          Retour <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    );
  }

  return <ScoreRevealFlow session={session} />;
}

function ScoreRevealFlow({ session }: { session: SessionData }) {
  const navigate = useNavigate();
  const score = session.score_global;

  const engine = useScoreRevealEngine(score, session.id || undefined);
  const quickWins = useMemo(() => getQuickWins(score), [score]);
  const weakness = useMemo(() => getMainWeakness(score), [score]);
  const dimensions = useMemo(() => getDefaultDimensions(score), [score]);

  // Auto-start the reveal
  useEffect(() => {
    const timer = setTimeout(() => engine.startReveal(), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Votre Score AIPP — UNPRO</title>
        <meta name="description" content="Découvrez votre Score AIPP et ce que l'IA perçoit de votre entreprise." />
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/30 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <UnproLogo size={100} variant="primary" animated={false} />
          <BadgeRevealStage stage={engine.stage} />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Section 1: Transcript / Alex speaking */}
        <PanelAlexTranscriptLive lines={engine.transcript} isTyping={engine.isTyping} />

        {/* Section 2: Score card — suspense or revealed */}
        <AnimatePresence mode="wait">
          {!engine.scoreRevealed ? (
            <motion.div key="suspense" exit={{ opacity: 0, scale: 0.9 }}>
              <CardScoreRevealSuspense
                stage={engine.stage === "preparing" ? "preparing" : engine.stage === "revealing" ? "awaiting" : "speaking"}
              />
            </motion.div>
          ) : (
            <motion.div key="hero" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <CardAIPPScoreHeroReveal
                score={score}
                revealed={engine.scoreRevealed}
                businessName={session.business_name}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section 3: Interpretation */}
        <CardAIPPInterpretationInstant score={score} visible={engine.interpretationVisible} />

        {/* Section 4: Sub-scores */}
        {engine.subScoresVisible && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-5 space-y-3"
          >
            <p className="text-sm font-bold text-foreground">Dimensions détaillées</p>
            <WidgetAIPPDimensionBarsAnimated dimensions={dimensions} revealed={engine.subScoresVisible} />
          </motion.div>
        )}

        {/* Section 5: Weakness */}
        <CardAIPPWeaknessHighlight
          weakness={weakness.weakness}
          description={weakness.description}
          impactLabel={weakness.impact}
          visible={engine.weaknessVisible}
        />

        {/* Section 6: Quick Wins */}
        <CardAIPPQuickWin wins={quickWins} visible={engine.quickWinsVisible} />

        {/* Section 7: CTAs */}
        {engine.stage === "complete" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 pt-2"
          >
            <Button
              size="lg"
              className="w-full rounded-xl"
              onClick={() => navigate("/entrepreneur/pricing")}
            >
              Voir le plan recommandé <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl"
              onClick={engine.replay}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Revoir le dévoilement
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
