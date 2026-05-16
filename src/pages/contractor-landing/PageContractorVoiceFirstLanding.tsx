import { useEffect, useCallback, useRef } from "react";
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
  const autoStartedRef = useRef(false);

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
    sessionStorage.setItem("unpro_landing_session", sessionId);
  }, []);

  const trackEntry = useCallback((mode: "voice" | "chat" | "auto") => {
    const sessionId = sessionStorage.getItem("unpro_landing_session");
    supabase.from("onboarding_entry_events").insert({
      session_id: sessionId,
      entry_mode: mode === "auto" ? "voice" : mode,
      source_channel: params.get("utm_source") || "direct",
      event_type: mode === "auto" ? "auto_entry" : "entry",
    }).then(() => {});
  }, [params]);

  const handleVoiceStart = useCallback(() => {
    autoStartedRef.current = true;
    trackEntry("voice");
    openAlex("contractor_onboarding", "fr");
  }, [openAlex, trackEntry]);

  const handleChatStart = useCallback(() => {
    trackEntry("chat");
    openAlex("contractor_onboarding", "fr");
  }, [openAlex, trackEntry]);

  // Strictly event-driven: Alex never auto-opens. The user must tap the orb /
  // "Parler à Alex" CTA. Listener-based autostart removed.

  return (
    <>
      <Helmet>
        <title>Plus de contrats grâce à l'intelligence artificielle | UNPRO</title>
        <meta name="description" content="UNPRO aide les entrepreneurs du Québec à obtenir plus de rendez-vous qualifiés, améliorer leur visibilité et convertir davantage. Voir mon potentiel gratuit." />
      </Helmet>
      <div className="min-h-screen bg-background pb-20">
        <HeroSectionContractorVoiceEntry onVoiceStart={handleVoiceStart} onChatStart={handleChatStart} />
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
