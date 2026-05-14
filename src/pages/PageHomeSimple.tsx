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
import HeroConciergeWarm from "@/components/home-concierge/HeroConciergeWarm";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";

export default function PageHomeSimple() {
  useEffect(() => {
    trackCopilotEvent("homepage_loaded");
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
          <title>UNPRO — Parlez à Alex | Le bon pro recommandé par IA au Québec</title>
          <meta
            name="description"
            content="Décrivez votre problème à Alex. L'IA d'UNPRO trouve le bon professionnel québécois et planifie le rendez-vous. Pas de magasinage, une seule recommandation."
          />
          <meta property="og:title" content="UNPRO — Parlez à Alex" />
          <meta
            property="og:description"
            content="Pas de leads partagés. Pas de magasinage. Une seule recommandation, un rendez-vous rapide."
          />
          <meta property="og:type" content="website" />
          <meta name="theme-color" content="#02060d" />
          <link rel="canonical" href="https://unpro.ca" />
          <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        </Helmet>

        <HeroOrbMockup />
      </MainLayout>
    </AlexProvider>
  );
}
