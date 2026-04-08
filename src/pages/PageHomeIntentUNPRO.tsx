/**
 * PageHomeIntentUNPRO — Intent-based homepage (feature flag: intent_home_v1).
 * Replaces generic homepage with a single voice/text entry point powered by Alex.
 */
import { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import MainLayout from "@/layouts/MainLayout";
import HeroSectionIntentEntry from "@/components/home-intent/HeroSectionIntentEntry";
import CardLivePredictionMatch, { type PredictionMatch } from "@/components/home-intent/CardLivePredictionMatch";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function PageHomeIntentUNPRO() {
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();
  const { user } = useAuth();
  const [match, setMatch] = useState<PredictionMatch | null>(null);
  const [loading, setLoading] = useState(false);

  const userName = user?.user_metadata?.first_name || null;

  const handleVoice = useCallback(() => {
    openAlex("intent");
  }, [openAlex]);

  const handleTextSubmit = useCallback(async (text: string) => {
    setLoading(true);
    try {
      // Save intent
      await supabase.from("user_intents").insert({
        user_id: user?.id ?? null,
        raw_input: text,
      });

      // Call intent detect edge function
      const { data } = await supabase.functions.invoke("intent-detect", {
        body: { text, userId: user?.id },
      });

      if (data?.match) {
        setMatch(data.match);
      } else {
        // Fallback: open Alex with the text as context
        openAlex("intent");
      }
    } catch {
      openAlex("intent");
    } finally {
      setLoading(false);
    }
  }, [user, openAlex]);

  const handleBook = useCallback(() => {
    navigate("/search");
  }, [navigate]);

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Votre projet, notre match | IA 24/7</title>
        <meta name="description" content="Décrivez votre besoin en 5 secondes. UNPRO trouve le bon professionnel et vous donne un rendez-vous garanti." />
        <link rel="canonical" href="https://unpro.ca" />
      </Helmet>

      <div className="relative flex flex-col min-h-screen">
        <HeroSectionIntentEntry
          userName={userName}
          onVoice={handleVoice}
          onTextSubmit={handleTextSubmit}
        />

        {/* Loading shimmer */}
        {loading && (
          <div className="px-5 max-w-md mx-auto w-full">
            <div className="glass-card p-5 rounded-2xl space-y-3 animate-pulse">
              <div className="h-4 bg-muted/60 rounded w-3/4" />
              <div className="h-3 bg-muted/40 rounded w-1/2" />
              <div className="h-10 bg-muted/40 rounded-xl mt-4" />
            </div>
          </div>
        )}

        {/* Prediction match */}
        <AnimatePresence>
          {match && !loading && (
            <div className="px-5 max-w-md mx-auto w-full pb-8">
              <p className="text-caption text-muted-foreground text-center mb-3">
                Meilleur match pour votre projet
              </p>
              <CardLivePredictionMatch match={match} onBook={handleBook} />
            </div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
}
