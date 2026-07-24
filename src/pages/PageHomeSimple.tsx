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
import HeroOrbMockup from "@/components/home-orb/HeroOrbMockup";
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
      "UNPRO aide les propriétaires à prendre de meilleures décisions de rénovation grâce à l'IA, à des recommandations personnalisées et au jumelage avec le bon entrepreneur — pas seulement trois soumissions.",
    url: "https://unpro.ca",
    areaServed: { "@type": "Place", name: "Quebec" },
    provider: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
    serviceType: "AI Home Intelligence Platform",
  };

  return (
    <AlexProvider>
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

        <HeroOrbMockup />
      </MainLayout>
    </AlexProvider>
  );
}
