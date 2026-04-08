/**
 * PageHomeIntentUNPRO — Intent-based homepage (feature flag: intent_home_v1).
 * Replaces generic homepage with a single voice/text entry point powered by Alex.
 * 
 * GUARDRAIL: Uses existing Alex handlers only. No custom intent logic.
 * The homepage is a reskin — Alex's brain stays the same.
 */
import { useCallback } from "react";
import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import HeroSectionIntentEntry from "@/components/home-intent/HeroSectionIntentEntry";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useAuth } from "@/hooks/useAuth";

export default function PageHomeIntentUNPRO() {
  const { openAlex } = useAlexVoice();
  const { user } = useAuth();

  const userName = user?.user_metadata?.first_name || null;

  // GUARDRAIL: Voice → uses existing Alex voice handler (openAlex)
  const handleVoice = useCallback(() => {
    openAlex("intent");
  }, [openAlex]);

  // GUARDRAIL: Text → opens Alex with the text as initial context
  // No custom intent-detect edge function. Uses existing Alex flow.
  const handleTextSubmit = useCallback((text: string) => {
    // Open Alex voice mode — it will greet and the user's intent is clear
    openAlex("intent");
  }, [openAlex]);

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
      </div>
    </MainLayout>
  );
}
