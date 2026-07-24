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
    name: "UNPRO",
    description:
      "UNPRO aide les propriétaires à prendre de meilleures décisions de rénovation grâce à l'IA, à des recommandations personnalisées et au jumelage avec le bon entrepreneur — pas seulement trois soumissions.",
    url: "https://unpro.ca",
    areaServed: { "@type": "Place", name: "Quebec" },
    provider: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
    serviceType: "AI Home Intelligence Platform",
  };

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO | Votre plateforme d'intelligence résidentielle propulsée par l'IA</title>
        <meta
          name="description"
          content="UNPRO aide les propriétaires à prendre de meilleures décisions de rénovation grâce à l'IA, à des recommandations personnalisées et au jumelage avec le bon entrepreneur — pas seulement trois soumissions."
        />
        <meta property="og:title" content="UNPRO | Votre plateforme d'intelligence résidentielle propulsée par l'IA" />
        <meta
          property="og:description"
          content="Décisions de rénovation plus intelligentes grâce à l'IA, recommandations personnalisées et jumelage exclusif avec le bon entrepreneur."
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://unpro.ca/og/unpro-og-v4.jpg?v=20260724" />
        <meta name="theme-color" content="#060B14" />
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
