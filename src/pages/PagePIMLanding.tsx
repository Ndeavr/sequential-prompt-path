/**
 * PagePIMLanding — Landing dédiée /pim.
 * Positionne le Passeport Intelligence Maison comme le carnet de vie de la propriété :
 * mémoire, historique, continuité, valeur, tranquillité d'esprit.
 *
 * Visual identity: dark cinematic (MainLayout 4-layer bg). Pas de Three.js.
 */
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import HeroSectionPIMLanding from "@/components/pim/HeroSectionPIMLanding";
import SectionPIMBenefits from "@/components/pim/SectionPIMBenefits";
import SectionFragmentedProblem from "@/components/pim/SectionFragmentedProblem";
import SectionHowPIMWorks from "@/components/pim/SectionHowPIMWorks";
import SectionNotCloudStorage from "@/components/pim/SectionNotCloudStorage";
import SectionPIMEmotional from "@/components/pim/SectionPIMEmotional";
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
      "Le Passeport Intelligence Maison conserve l'historique complet de votre propriété : rénovations, garanties, inspections, factures, équipements et documents importants, réunis dans un dossier vivant.",
    url: "https://unpro.ca/pim",
    areaServed: { "@type": "Place", name: "Quebec" },
    provider: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
    serviceType: "Carnet de vie résidentiel",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Qu'est-ce que le Passeport Intelligence Maison ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Le Passeport Intelligence Maison est le dossier permanent de votre propriété. Rénovations, garanties, inspections, factures, équipements et documents importants sont conservés au même endroit et évoluent avec votre maison au fil des années.",
        },
      },
      {
        "@type": "Question",
        name: "Est-ce simplement un stockage de documents ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Non. C'est un dossier vivant qui conserve l'historique complet de votre propriété : ce qui a été fait, quand, par qui et avec quelles garanties. Vous gardez une trace claire, utile lors d'une vente, d'un refinancement ou d'une réclamation.",
        },
      },
      {
        "@type": "Question",
        name: "Comment commencer ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Créez votre Passeport Maison en moins de 30 secondes, ajoutez vos premiers documents et photos. C'est gratuit, sans engagement.",
        },
      },
    ],
  };

  return (
    <MainLayout>
      <Helmet>
        <title>Passeport Intelligence Maison — la mémoire de votre propriété | UNPRO</title>
        <meta
          name="description"
          content="Le Passeport Intelligence Maison conserve l'historique complet de votre propriété : rénovations, garanties, inspections, factures, équipements et documents importants, réunis au même endroit."
        />
        <meta property="og:title" content="PIM — La mémoire de votre maison" />
        <meta
          property="og:description"
          content="Votre maison possède désormais sa propre mémoire. Rénovations, garanties, inspections et documents importants conservés au même endroit, pour les années à venir."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://unpro.ca/pim" />
        <meta name="theme-color" content="#050816" />
        <link rel="canonical" href="https://unpro.ca/pim" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <HeroSectionPIMLanding />
      <SectionPIMBenefits />
      <SectionFragmentedProblem />
      <SectionHowPIMWorks />
      <SectionNotCloudStorage />
      <SectionPIMEmotional />
      <SectionAlexCapabilities />
      <SectionForOrganizations />
      <SectionPIMFinalCTA />
    </MainLayout>
  );
}
