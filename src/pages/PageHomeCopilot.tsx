/**
 * PageHomeCopilot — UNPRO Copilot-style mobile-first homepage.
 *
 * Replaces the legacy Home for the `/` and `/index` routes via HomeWithFeatureFlag.
 * Wrapped in MainLayout so the SmartHeader (logo + FR/EN + QR + hamburger),
 * MobileBottomNav and global concierge surfaces remain visible.
 *
 * RULE: One question. One recommended pro. One action. Never 3 quotes.
 */
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import HeroCopilotMobile from "@/components/home-copilot/HeroCopilotMobile";
import PropertyIntelligenceTicker from "@/components/home-copilot/PropertyIntelligenceTicker";
import HomeIntelligenceActionGrid from "@/components/home-copilot/HomeIntelligenceActionGrid";
import SectionsBelowFold from "@/components/home-copilot/SectionsBelowFold";
import StickyBottomAlexCTA from "@/components/home-copilot/StickyBottomAlexCTA";
import AlexCopilotConversation from "@/components/alex-copilot/AlexCopilotConversation";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";

export default function PageHomeCopilot() {
  useEffect(() => {
    trackCopilotEvent("homepage_loaded");
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "UNPRO — Passeport Maison",
    description:
      "UNPRO crée le Passeport Maison de votre propriété : historique, entretiens, garanties, factures et professionnels au même endroit pour prendre de meilleures décisions.",
    url: "https://unpro.ca",
    areaServed: { "@type": "Place", name: "Quebec" },
    provider: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
    serviceType: "Home Intelligence Platform",
  };

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Passeport Maison : l'intelligence de votre propriété</title>
        <meta
          name="description"
          content="Votre Passeport Maison conserve l'historique de votre propriété pour planifier les entretiens, anticiper les dépenses et prendre de meilleures décisions."
        />
        <meta property="og:title" content="UNPRO — Passeport Maison : l'intelligence de votre propriété" />
        <meta
          property="og:description"
          content="Historique, entretiens, garanties, factures et professionnels — au même endroit. Prenez de meilleures décisions pour votre maison."
        />
        <meta property="og:type" content="website" />
        <meta name="theme-color" content="#050A12" />
        <link rel="canonical" href="https://unpro.ca" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="bg-[hsl(220_50%_4%)]">
        <HeroCopilotMobile />
        <PropertyIntelligenceTicker />
        <HomeIntelligenceActionGrid />
        <SectionsBelowFold />
        <StickyBottomAlexCTA />
        <AlexCopilotConversation />
      </div>
    </MainLayout>
  );
}
