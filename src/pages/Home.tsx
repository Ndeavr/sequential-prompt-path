import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import HeroSection from "@/components/home/HeroSection";
import SectionNoMoreQuotes from "@/components/home/SectionNoMoreQuotes";
import SectionAlexConversationAd from "@/components/home/SectionAlexConversationAd";
import SectionPasseportCards from "@/components/home/SectionPasseportCards";
import SectionHowItWorks from "@/components/home/SectionHowItWorks";
import SectionEntrepreneurCTA from "@/components/home/SectionEntrepreneurCTA";
import SectionTrustProof from "@/components/home/SectionTrustProof";
import SectionManifestoCTA from "@/components/home/SectionManifestoCTA";
import SectionHomeCounterImpactIA from "@/components/impact-counter/SectionHomeCounterImpactIA";
import StickyMiniCounterBar from "@/components/impact-counter/StickyMiniCounterBar";

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

      <StickyMiniCounterBar />
      <div className="flex flex-col">
        {/* Hero cinématique — Problème / Projet / Avis */}
        <HeroSection />

        {/* Alex Conversation Ad Preview */}
        <SectionAlexConversationAd />

        {/* Bulle explicative — Comparer 3 soumissions ? */}
        <SectionNoMoreQuotes />

        {/* Manifeste UNPRO — CTA card */}
        <SectionManifestoCTA />

        {/* Passeport Maison / Condo / Entrepreneur */}
        <SectionPasseportCards />

        {/* Comment ça marche — 3 étapes */}
        <SectionHowItWorks />

        {/* Banner entrepreneur */}
        <SectionEntrepreneurCTA />

        {/* Compteur impact IA Québec */}
        <SectionHomeCounterImpactIA />

        {/* Social proof, testimonials, FAQ */}
        <SectionTrustProof />
      </div>
    </MainLayout>
  );
};

export default Home;
