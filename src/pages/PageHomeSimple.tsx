/**
 * PageHomeSimple — UNPRO Alex-first simple homepage.
 *
 * Replaces the legacy/busy home for `/` and `/index`.
 * - Single column, mobile-first
 * - Large pulsating Alex orb as the visual anchor
 * - Embedded chat (greeting bubble + input + upload) right on the page
 * - 8 intent chips
 * - Two trust promise cards (homeowners / contractors)
 * - No floating Alex bubble (MainLayout already hides it on `/`)
 */
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import { AlexProvider } from "@/features/alex";
import HeroAlexCentered from "@/components/home-simple/HeroAlexCentered";
import AlexEmbeddedChat from "@/components/home-simple/AlexEmbeddedChat";
import IntentChipsGrid from "@/components/home-simple/IntentChipsGrid";
import TrustPromiseCards from "@/components/home-simple/TrustPromiseCards";
import TrustFooterStrip from "@/components/home-simple/TrustFooterStrip";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";

export default function PageHomeSimple() {
  useEffect(() => {
    trackCopilotEvent("homepage_simple_loaded");
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "UNPRO",
    description:
      "Alex, l'IA d'UNPRO, vous aide à estimer, comprendre, comparer et trouver le bon professionnel pour votre projet maison au Québec.",
    url: "https://unpro.ca",
    areaServed: { "@type": "Place", name: "Quebec" },
    provider: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
    serviceType: "Recommandation entrepreneur résidentiel par IA",
  };

  return (
    <AlexProvider>
      <MainLayout>
        <Helmet>
          <title>UNPRO — Décrivez votre projet à Alex | Le bon pro recommandé par IA</title>
          <meta
            name="description"
            content="Décrivez votre problème ou imaginez votre projet. Alex, l'IA d'UNPRO, vous aide à estimer, comprendre, comparer et trouver le bon professionnel québécois."
          />
          <meta property="og:title" content="UNPRO — Décrivez votre projet à Alex" />
          <meta
            property="og:description"
            content="Pas de leads partagés. Pas de magasinage. Une seule recommandation, un rendez-vous rapide."
          />
          <meta property="og:type" content="website" />
          <meta name="theme-color" content="#060B14" />
          <link rel="canonical" href="https://unpro.ca" />
          <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        </Helmet>

        <div className="max-w-3xl mx-auto pb-12">
          <HeroAlexCentered />
          <AlexEmbeddedChat />
          <IntentChipsGrid />
          <TrustPromiseCards />
          <TrustFooterStrip />
        </div>
      </MainLayout>
    </AlexProvider>
  );
}
