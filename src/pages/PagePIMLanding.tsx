/**
 * PagePIMLanding — Landing dédiée /pim.
 * Repositionne UNPRO comme infrastructure d'intelligence résidentielle via le
 * Passeport Intelligence Maison.
 *
 * Visual identity: dark cinematic (MainLayout 4-layer bg). Pas de Three.js.
 */
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import HeroSectionPIMLanding from "@/components/pim/HeroSectionPIMLanding";
import SectionFragmentedProblem from "@/components/pim/SectionFragmentedProblem";
import SectionHowPIMWorks from "@/components/pim/SectionHowPIMWorks";
import SectionNotCloudStorage from "@/components/pim/SectionNotCloudStorage";
import SectionAlexCapabilities from "@/components/pim/SectionAlexCapabilities";
import SectionForOrganizations from "@/components/pim/SectionForOrganizations";
import SectionPIMFinalCTA from "@/components/pim/SectionPIMFinalCTA";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";

export default function PagePIMLanding() {
  useEffect(() => {
    trackCopilotEvent("pim_landing_viewed");
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "PIM — Passeport Intelligence Maison",
    description:
      "PIM transforme votre propriété en profil intelligent lisible par l'IA. Rénovations, soumissions, inspections, subventions, garanties, risques — centralisés et analysés.",
    url: "https://unpro.ca/pim",
    areaServed: { "@type": "Place", name: "Quebec" },
    provider: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
    serviceType: "Infrastructure d'intelligence résidentielle",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Qu'est-ce que PIM ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "PIM (Passeport Intelligence Maison) est une infrastructure d'intelligence résidentielle. Il transforme votre propriété en profil lisible par l'IA, reliant documents, événements, risques et décisions sur le long terme.",
        },
      },
      {
        "@type": "Question",
        name: "PIM est-il un stockage de documents ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Non. PIM n'est pas un coffre à documents. C'est un système vivant qui lit, classe, comprend et anticipe — une mémoire intelligente pour votre maison.",
        },
      },
      {
        "@type": "Question",
        name: "Comment commencer ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Créez votre profil propriété en moins de 30 secondes, uploadez vos documents et photos, et laissez l'IA analyser. C'est gratuit, sans engagement.",
        },
      },
    ],
  };

  return (
    <MainLayout>
      <Helmet>
        <title>PIM — Passeport Intelligence Maison | UNPRO</title>
        <meta
          name="description"
          content="PIM transforme votre propriété en profil intelligent. Rénovations, soumissions, inspections, subventions, garanties, risques — analysés par l'IA. Aucun coffre à documents : une infrastructure d'intelligence résidentielle."
        />
        <meta property="og:title" content="PIM — Le Passeport Intelligence Maison" />
        <meta
          property="og:description"
          content="Votre maison devrait tout se souvenir. PIM est l'infrastructure d'intelligence pour le résidentiel."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://unpro.ca/pim" />
        <meta name="theme-color" content="#050816" />
        <link rel="canonical" href="https://unpro.ca/pim" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <HeroSectionPIMLanding />
      <SectionFragmentedProblem />
      <SectionHowPIMWorks />
      <SectionNotCloudStorage />
      <SectionAlexCapabilities />
      <SectionForOrganizations />
      <SectionPIMFinalCTA />
    </MainLayout>
  );
}
