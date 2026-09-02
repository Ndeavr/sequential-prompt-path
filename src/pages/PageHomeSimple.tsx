/**
 * PageHomeSimple — UNPRO homepage: "La fin des 3 soumissions."
 *
 * Route `/` and `/index`. Single narrative:
 * Hero (promesse + Alex) → Problème → Alex → Nouveau modèle → Pourquoi UNPRO
 * peut recommander → Comparaison de soumissions → Passeport Maison →
 * Entrepreneurs → CTA final.
 */
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import { AlexProvider } from "@/features/alex";
import HeroOrbMockup from "@/components/home-orb/HeroOrbMockup";
import {
  SectionProblemeTroisSoumissions,
  SectionAlexUneQuestion,
  SectionNouveauModele,
  SectionPourquoiRecommander,
  SectionComparerSoumissions,
  SectionPasseportMaison,
  SectionEntrepreneursEntree,
  SectionCtaFinal,
} from "@/components/home-fin3/HomeFin3Sections";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";
import { DEFAULT_OG_IMAGE } from "@/seo/ogImage";

export default function PageHomeSimple() {
  useEffect(() => {
    trackCopilotEvent("homepage_loaded");
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "UNPRO",
    description:
      "Décrivez vos travaux à Clara. UNPRO utilise l'IA pour comprendre votre projet et vous aider à trouver l'entrepreneur qui correspond à vos besoins, sans courir après 3 soumissions.",
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
            content="Décrivez vos travaux à Clara. UNPRO utilise l'IA pour comprendre votre projet et vous aider à trouver l'entrepreneur qui correspond à vos besoins, sans courir après 3 soumissions."
          />
          <meta property="og:title" content="UNPRO — La fin des 3 soumissions" />
          <meta
            property="og:description"
            content="L'IA trouve le bon entrepreneur pour vos travaux."
          />
          <meta property="og:type" content="website" />
          <meta property="og:url" content="https://unpro.ca/" />
          <meta property="og:image" content={DEFAULT_OG_IMAGE} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="UNPRO — La fin des 3 soumissions" />
          <meta name="twitter:description" content="L'IA trouve le bon entrepreneur pour vos travaux." />
          <meta name="twitter:image" content={DEFAULT_OG_IMAGE} />
          <meta name="theme-color" content="#060B14" />
          <link rel="canonical" href="https://unpro.ca/" />
          <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        </Helmet>

        <HeroOrbMockup />
        <SectionProblemeTroisSoumissions />
        <SectionAlexUneQuestion />
        <SectionNouveauModele />
        <SectionPourquoiRecommander />
        <SectionComparerSoumissions />
        <SectionPasseportMaison />
        <SectionEntrepreneursEntree />
        <SectionCtaFinal />
      </MainLayout>
    </AlexProvider>
  );
}
