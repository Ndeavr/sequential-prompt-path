/**
 * PageHomeCopilot — UNPRO Copilot-style mobile-first homepage.
 *
 * Replaces the legacy Home for the `/` and `/index` routes via HomeWithFeatureFlag.
 * RULE: One question. One recommended pro. One action. Never 3 quotes.
 */
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import HeroCopilotMobile from "@/components/home-copilot/HeroCopilotMobile";
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
    <div className="bg-[hsl(220_50%_4%)] min-h-screen">
      <Helmet>
        <title>UNPRO — Le Copilot des projets maison | Le bon pro, recommandé par IA</title>
        <meta
          name="description"
          content="Décrivez votre projet à Alex. UNPRO recommande le meilleur entrepreneur vérifié et planifie le rendez-vous. Pas de 3 soumissions, juste la bonne réponse."
        />
        <meta property="og:title" content="UNPRO — Le bon pro, recommandé par IA" />
        <meta
          property="og:description"
          content="Une question, une recommandation, un rendez-vous rapide. UNPRO trouve votre meilleur entrepreneur."
        />
        <meta property="og:type" content="website" />
        <meta name="theme-color" content="#050A12" />
        <link rel="canonical" href="https://unpro.ca" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <HeroCopilotMobile />
      <SectionsBelowFold />
      <StickyBottomAlexCTA />
      <AlexCopilotConversation />
    </div>
  );
}
