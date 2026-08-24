/**
 * PageHomeLight — UNPRO homeowner-first homepage (light premium surface).
 *
 * White / light-blue background, navy typography, royal-blue actions.
 * Alex is integrated as the primary entry point; both the homeowner and the
 * entrepreneur paths are visible above the fold area.
 */
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import MainLayout from "@/layouts/MainLayout";
import { AlexProvider } from "@/features/alex";
import HeroHomeownerLight from "@/components/home-light/HeroHomeownerLight";
import {
  SectionTwoPaths,
  SectionHowItWorks,
  SectionTransparency,
  SectionPasseport,
  SectionFinalCta,
} from "@/components/home-light/HomeLightSections";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";
import { DEFAULT_OG_IMAGE } from "@/seo/ogImage";

export default function PageHomeLight() {
  useEffect(() => {
    trackCopilotEvent("homepage_loaded");
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "UNPRO",
    description:
      "Décrivez vos travaux à Alex. UNPRO utilise l'IA pour comprendre votre projet et vous orienter vers l'entrepreneur qui correspond à vos besoins, sans courir après 3 soumissions.",
    url: "https://unpro.ca",
    areaServed: { "@type": "Place", name: "Quebec" },
    provider: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
    serviceType: "Recommandation IA d'entrepreneurs résidentiels",
  };

  return (
    <AlexProvider>
      <MainLayout>
        <Helmet>
          <title>UNPRO | La fin des 3 soumissions</title>
          <meta
            name="description"
            content="Décrivez vos travaux à Alex. UNPRO comprend votre projet grâce à l'IA et vous oriente vers l'entrepreneur qui correspond à vos besoins, sans courir après 3 soumissions."
          />
          <meta property="og:title" content="UNPRO — La fin des 3 soumissions" />
          <meta
            property="og:description"
            content="L'IA comprend vos travaux et vous oriente vers le bon entrepreneur."
          />
          <meta property="og:type" content="website" />
          <meta property="og:url" content="https://unpro.ca/" />
          <meta property="og:image" content={DEFAULT_OG_IMAGE} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="UNPRO — La fin des 3 soumissions" />
          <meta
            name="twitter:description"
            content="L'IA comprend vos travaux et vous oriente vers le bon entrepreneur."
          />
          <meta name="twitter:image" content={DEFAULT_OG_IMAGE} />
          <meta name="theme-color" content="#F5F9FF" />
          <link rel="canonical" href="https://unpro.ca/" />
          <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        </Helmet>

        <div className="home-light">
          <HeroHomeownerLight />
          <SectionTwoPaths />
          <SectionHowItWorks />
          <SectionTransparency />
          <SectionPasseport />
          <SectionFinalCta />
        </div>
      </MainLayout>
    </AlexProvider>
  );
}
