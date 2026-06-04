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
        <title>UNPRO — Le registre intelligent des entrepreneurs RBQ au Québec</title>
        <meta
          name="description"
          content="UNPRO aide les propriétaires à vérifier, comprendre et sélectionner les bons entrepreneurs RBQ grâce à l'intelligence artificielle, aux avis et aux signaux de confiance réels."
        />
        <meta property="og:title" content="UNPRO — Le registre intelligent des entrepreneurs RBQ au Québec" />
        <meta
          property="og:description"
          content="Vérifier, comprendre et sélectionner les bons entrepreneurs RBQ. Données structurées, avis, territoires desservis — par UNPRO."
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
