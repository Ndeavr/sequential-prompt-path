/**
 * PageHomeLight — ONE CLARA conversation-first homepage.
 */
import { useEffect } from "react";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { Helmet } from "react-helmet-async";

import MainLayout from "@/layouts/MainLayout";
import { AlexProvider } from "@/features/alex";
import HeroHomeownerLight from "@/components/home-light/HeroHomeownerLight";
import { SectionMatchingPaths } from "@/components/home-light/HomeLightSections";
import SectionProjectInspiration from "@/components/home-light/SectionProjectInspiration";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";
import { DEFAULT_OG_IMAGE } from "@/seo/ogImage";
import { CLARA_HOMEOWNER_REQUEST_EVENT } from "@/services/clara/claraContractorResume";

export default function PageHomeLight() {
  const { lang } = useLanguage();
  const title = lang === "fr" ? "UNPRO | De la soumission à la réalisation" : "UNPRO | The right professional. For the right need.";
  const description = lang === "fr"
    ? "Le lien le plus court entre une soumission et la réalisation. L’IA au service de la rénovation, de l’entretien et de l’immobilier. Clara vous aide à trouver le bon professionnel."
    : "UNPRO helps you find a professional based on your situation, criteria and region. Real estate, property care, renovation and repairs in Quebec.";
  const ogImage = lang === "fr" ? "https://unpro.ca/og/link/unpro-v1.jpg" : DEFAULT_OG_IMAGE;
  useEffect(() => {
    trackCopilotEvent("homepage_loaded");
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "UNPRO",
    description:
      description,
    url: "https://unpro.ca",
    areaServed: { "@type": "Place", name: "Quebec" },
    provider: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
    serviceType: ["Immobilier et services professionnels", "Entretien et services", "Rénovation et réparations"],
  };

  return (
    <AlexProvider>
      <MainLayout hideMemorySection>
        <Helmet>
          <title>{title}</title>
          <meta
            name="description"
            content={description}
          />
          <meta property="og:title" content={title} />
          <meta
            property="og:description"
            content={description}
          />
          <meta property="og:type" content="website" />
          <meta property="og:url" content="https://unpro.ca/" />
          <meta property="og:image" content={ogImage} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={title} />
          <meta
            name="twitter:description"
            content={description}
          />
          <meta name="twitter:image" content={ogImage} />
          <link rel="canonical" href="https://unpro.ca/" />
          <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        </Helmet>

        <div className="home-light">
          <div id="clara-home"><HeroHomeownerLight /></div>
          <SectionProjectInspiration />
          <SectionMatchingPaths onStartHomeowner={() => {
            window.dispatchEvent(new Event(CLARA_HOMEOWNER_REQUEST_EVENT));
            const field = document.querySelector<HTMLTextAreaElement>("#clara-home textarea");
            if (!field) return;
            field.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
            field.focus({ preventScroll: true });
          }} />
          <div className="home-afterglow" aria-hidden="true" />
        </div>
      </MainLayout>
    </AlexProvider>
  );
}
