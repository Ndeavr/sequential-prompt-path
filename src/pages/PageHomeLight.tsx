/**
 * PageHomeLight — ONE CLARA conversation-first homepage.
 */
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import MainLayout from "@/layouts/MainLayout";
import { AlexProvider } from "@/features/alex";
import HeroHomeownerLight from "@/components/home-light/HeroHomeownerLight";
import {
  SectionProjectTiles,
  SectionHomeScore,
  SectionTwoPaths,
  SectionHowItWorks,
  SectionTransparency,
  SectionPasseport,
  SectionFinalCta,
} from "@/components/home-light/HomeLightSections";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";
import { DEFAULT_OG_IMAGE } from "@/seo/ogImage";
import { CLARA_HOMEOWNER_REQUEST_EVENT } from "@/services/clara/claraContractorResume";

export default function PageHomeLight() {
  useEffect(() => {
    trackCopilotEvent("homepage_loaded");
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "UNPRO",
    description:
      "Décrivez vos travaux à Clara. UNPRO utilise l'IA pour comprendre votre projet et vous orienter vers l'entrepreneur qui correspond à vos besoins, sans courir après 3 soumissions.",
    url: "https://unpro.ca",
    areaServed: { "@type": "Place", name: "Quebec" },
    provider: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
    serviceType: "Recommandation IA d'entrepreneurs résidentiels",
  };

  return (
    <AlexProvider>
      <MainLayout hideMemorySection>
        <Helmet>
          <title>UNPRO | Un projet de rénovation en tête?</title>
          <meta
            name="description"
            content="Montrez ou décrivez votre besoin à Clara. Elle vous aide à comprendre, vérifier ou améliorer votre propriété."
          />
          <meta property="og:title" content="UNPRO — Parlez à Clara" />
          <meta
            property="og:description"
            content="Montrez ou décrivez votre besoin à Clara, l’intelligence résidentielle UNPRO."
          />
          <meta property="og:type" content="website" />
          <meta property="og:url" content="https://unpro.ca/" />
          <meta property="og:image" content={DEFAULT_OG_IMAGE} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="UNPRO — Parlez à Clara" />
          <meta
            name="twitter:description"
            content="Montrez ou décrivez votre besoin à Clara, l’intelligence résidentielle UNPRO."
          />
          <meta name="twitter:image" content={DEFAULT_OG_IMAGE} />
          <link rel="canonical" href="https://unpro.ca/" />
          <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        </Helmet>

        <div className="home-light unpro-premium-home">
          <div id="clara-home"><HeroHomeownerLight /></div>
          <SectionProjectTiles />
          <SectionHomeScore />
          <SectionTwoPaths onStartHomeowner={() => {
            window.dispatchEvent(new Event(CLARA_HOMEOWNER_REQUEST_EVENT));
            const target = document.querySelector<HTMLElement>("#clara-conversation");
            target?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
            const input = target?.querySelector<HTMLTextAreaElement>("textarea");
            input?.focus({ preventScroll: true });
          }} />
          <SectionHowItWorks />
          <SectionTransparency />
          <SectionPasseport />
          <SectionFinalCta />
        </div>
      </MainLayout>
    </AlexProvider>
  );
}
