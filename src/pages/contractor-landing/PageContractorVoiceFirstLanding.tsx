import { useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { supabase } from "@/integrations/supabase/client";

import HeroSectionContractorVoiceEntry from "@/components/contractor-landing/HeroSectionContractorVoiceEntry";
import CardVisibilityScorePromise from "@/components/contractor-landing/CardVisibilityScorePromise";
import SectionHowUnproWorksContractor from "@/components/contractor-landing/SectionHowUnproWorksContractor";
import SectionTrustSignalsContractor from "@/components/contractor-landing/SectionTrustSignalsContractor";
import SectionFAQContractorOnboarding from "@/components/contractor-landing/SectionFAQContractorOnboarding";
import StickyFooterPrimaryCTA from "@/components/contractor-landing/StickyFooterPrimaryCTA";

function getDeviceType() {
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export default function PageContractorVoiceFirstLanding() {
  const [params] = useSearchParams();
  const { openAlex } = useAlexVoice();

  // Track landing visit
  useEffect(() => {
    const sessionId = crypto.randomUUID();
    supabase.from("landing_visits").insert({
      session_id: sessionId,
      page_key: "contractor_voice_landing",
      utm_source: params.get("utm_source") || null,
      utm_medium: params.get("utm_medium") || null,
      utm_campaign: params.get("utm_campaign") || null,
      referrer: document.referrer || null,
      device_type: getDeviceType(),
    }).then(() => {});

    // Store session for later events
    sessionStorage.setItem("unpro_landing_session", sessionId);
  }, []);

  const trackEntry = useCallback((mode: "voice" | "chat") => {
    const sessionId = sessionStorage.getItem("unpro_landing_session");
    supabase.from("onboarding_entry_events").insert({
      session_id: sessionId,
      entry_mode: mode,
      source_channel: params.get("utm_source") || "direct",
      event_type: "entry",
    }).then(() => {});
  }, [params]);

  const handleVoiceStart = useCallback(() => {
    trackEntry("voice");
    openAlex("contractor_onboarding");
  }, [openAlex, trackEntry]);

  const handleChatStart = useCallback(() => {
    trackEntry("chat");
    openAlex("contractor_onboarding");
  }, [openAlex, trackEntry]);

  return (
    <>
      <Helmet>
        <title>Entrepreneurs — Découvrez votre score de visibilité IA | UNPRO</title>
        <meta
          name="description"
          content="Analyse gratuite en 30 secondes. Découvrez comment ChatGPT et Gemini perçoivent votre entreprise et recevez vos premiers rendez-vous qualifiés."
        />
      </Helmet>

      <div className="min-h-screen bg-background pb-20">
        <HeroSectionContractorVoiceEntry
          onVoiceStart={handleVoiceStart}
          onChatStart={handleChatStart}
        />

        <div className="max-w-lg mx-auto px-4 space-y-2">
          <CardVisibilityScorePromise />
        </div>

        <SectionHowUnproWorksContractor />
        <SectionTrustSignalsContractor />
        <SectionFAQContractorOnboarding />

        <StickyFooterPrimaryCTA onVoice={handleVoiceStart} onChat={handleChatStart} />
      </div>
    </>
  );
}
