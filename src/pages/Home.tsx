import { lazy, Suspense } from "react";
import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import HeroSection from "@/components/home/HeroSection";

// Below-the-fold — code-split for performance
const SectionNoMoreQuotes = lazy(() => import("@/components/home/SectionNoMoreQuotes"));
const SectionAlexConversationAd = lazy(() => import("@/components/home/SectionAlexConversationAd"));
const SectionPasseportCards = lazy(() => import("@/components/home/SectionPasseportCards"));
const SectionHowItWorks = lazy(() => import("@/components/home/SectionHowItWorks"));
const SectionEntrepreneurCTA = lazy(() => import("@/components/home/SectionEntrepreneurCTA"));
const SectionTrustProof = lazy(() => import("@/components/home/SectionTrustProof"));
const SectionManifestoCTA = lazy(() => import("@/components/home/SectionManifestoCTA"));
const SectionHomeCounterImpactIA = lazy(() => import("@/components/impact-counter/SectionHomeCounterImpactIA"));
const BarStickyCounterRealtime = lazy(() => import("@/components/impact-counter/BarStickyCounterRealtime"));

const Home = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "UNPRO",
    "description": "Service intelligent de jumelage avec rendez-vous garantis entre propriétaires et entrepreneurs vérifiés au Québec.",
    "url": "https://unpro.ca",
    "areaServed": { "@type": "Place", "name": "Quebec" },
    "provider": { "@type": "Organization", "name": "UNPRO", "url": "https://unpro.ca" },
    "serviceType": "Jumelage entrepreneur résidentiel",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "Pourquoi éviter les 3 soumissions ?", "acceptedAnswer": { "@type": "Answer", "text": "Comparer des prix ne garantit pas la qualité. UNPRO sélectionne directement le bon entrepreneur selon votre projet." } },
      { "@type": "Question", "name": "Est-ce que le rendez-vous est garanti ?", "acceptedAnswer": { "@type": "Answer", "text": "Oui. Chaque demande est transformée en rendez-vous confirmé avec un entrepreneur qualifié." } },
      { "@type": "Question", "name": "Comment UNPRO choisit l'entrepreneur ?", "acceptedAnswer": { "@type": "Answer", "text": "Le système analyse votre projet, localisation et disponibilité pour trouver le meilleur match." } },
    ]
  };

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Rendez-vous garantis avec entrepreneurs vérifiés | IA 24/7</title>
        <meta name="description" content="Fini les 3 soumissions inutiles. Décrivez votre projet et obtenez un rendez-vous confirmé avec un entrepreneur qualifié. IA Alex 24/7." />
        <meta property="og:title" content="UNPRO — Rendez-vous garantis avec entrepreneurs vérifiés" />
        <meta property="og:description" content="UNPRO remplace les soumissions multiples par un rendez-vous garanti avec le bon entrepreneur." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://unpro.ca" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <Suspense fallback={null}><BarStickyCounterRealtime /></Suspense>
      <div className="flex flex-col">
        <HeroSection />
        <Suspense fallback={null}>
          <SectionAlexConversationAd />
          <SectionNoMoreQuotes />
          <SectionManifestoCTA />
          <SectionPasseportCards />
          <SectionHowItWorks />
          <SectionEntrepreneurCTA />
          <SectionHomeCounterImpactIA />
          <SectionTrustProof />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default Home;
