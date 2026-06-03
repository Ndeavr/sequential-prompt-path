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
      "UNPRO recommande le meilleur professionnel vérifié pour votre projet maison au Québec. Une seule recommandation, un rendez-vous rapide.",
    url: "https://unpro.ca",
    areaServed: { "@type": "Place", name: "Quebec" },
    provider: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
    serviceType: "Recommandation entrepreneur résidentiel par IA",
  };

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Votre maison, enfin comprise par l'IA</title>
        <meta
          name="description"
          content="UNPRO est le système d'intelligence IA pour les propriétaires. Diagnostic visuel, analyse de soumission, vérification d'entrepreneur et Passeport Maison — tout au même endroit."
        />
        <meta property="og:title" content="UNPRO — Votre maison, enfin comprise par l'IA" />
        <meta
          property="og:description"
          content="Le système d'intelligence pour comprendre votre maison, réduire les risques et trouver le bon professionnel au bon moment."
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
