import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import HeroSectionAlexFirst from "@/components/home/HeroSectionAlexFirst";

const Home = () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "UNPRO",
    description:
      "Concierge IA québécois. Décrivez votre problème, Alex analyse, vérifie et planifie le rendez-vous avec le bon entrepreneur.",
    url: "https://unpro.ca",
    areaServed: { "@type": "Place", name: "Quebec" },
    provider: { "@type": "Organization", name: "UNPRO", url: "https://unpro.ca" },
    serviceType: "Concierge IA résidentiel",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Comment fonctionne UNPRO ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Vous décrivez votre besoin à Alex (voix, texte ou photo). Alex analyse, recommande le bon professionnel vérifié et planifie le rendez-vous.",
        },
      },
      {
        "@type": "Question",
        name: "Pourquoi éviter les 3 soumissions ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Comparer des prix ne garantit pas la qualité. UNPRO sélectionne directement le bon entrepreneur selon votre projet et votre zone.",
        },
      },
      {
        "@type": "Question",
        name: "Le rendez-vous est-il garanti ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui. Chaque demande qualifiée par Alex devient un rendez-vous confirmé avec un entrepreneur vérifié.",
        },
      },
    ],
  };

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Parlez à Alex. Trouvez le bon pro sans soumissions.</title>
        <meta
          name="description"
          content="Concierge IA québécois. Décrivez votre problème, Alex s'occupe du reste : analyse, estimation, vérification, réservation."
        />
        <meta property="og:title" content="UNPRO — Parlez à Alex. Trouvez le bon pro sans soumissions." />
        <meta
          property="og:description"
          content="Décrivez votre problème, Alex s'occupe du reste. Analyse. Estimation. Vérification. Réservation."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://unpro.ca" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <HeroSectionAlexFirst />
    </MainLayout>
  );
};

export default Home;
