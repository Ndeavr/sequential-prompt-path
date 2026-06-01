/**
 * PageHomeIntelligence — The new UNPRO homeowner intelligence homepage.
 * Mounted at `/` and `/index`. Inherits MainLayout's cinematic dark background.
 */
import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import HeroIntelligence from "@/components/home-intel/HeroIntelligence";
import SituationCardsCarousel from "@/components/home-intel/SituationCardsCarousel";

export default function PageHomeIntelligence() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "UNPRO",
    description:
      "Le système d'intelligence pour votre maison. Diagnostic IA, vérification de soumissions, Passeport Maison et plus.",
    url: "https://unpro.ca",
    areaServed: { "@type": "Place", name: "Quebec" },
    provider: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
    serviceType: "AI operating system for homeowners",
  };

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Votre maison enfin comprise par l'IA</title>
        <meta
          name="description"
          content="Décrivez un problème, importez une photo ou analysez une soumission. UNPRO est l'IA qui comprend votre maison et vous recommande la bonne action."
        />
        <meta property="og:title" content="UNPRO — Votre maison enfin comprise par l'IA" />
        <meta
          property="og:description"
          content="Diagnostic visuel IA, vérification de soumissions, Passeport Maison. L'opérating system des propriétaires."
        />
        <meta property="og:type" content="website" />
        <meta name="theme-color" content="#050816" />
        <link rel="canonical" href="https://unpro.ca" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <HeroIntelligence />
      <SituationCardsCarousel />

      <div className="h-24" />
    </MainLayout>
  );
}
