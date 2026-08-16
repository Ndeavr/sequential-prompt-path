/**
 * homeFin3 — Single source of copy for the "La fin des 3 soumissions" homepage.
 * FR is canonical (Québec). EN is idiomatic, not a word-for-word translation.
 * No invented claims: no ratings, reviews, RBQ, insurance, availability.
 */

export type Lang = "fr" | "en";

export const homeFin3 = {
  fr: {
    hero: {
      eyebrow: "UNPRO + ALEX",
      title: "LA FIN DES 3 SOUMISSIONS.",
      subtitle: "L'IA trouve le bon entrepreneur pour vos travaux.",
      body: "Plus besoin de contacter plusieurs entreprises, répéter votre projet et comparer des soumissions difficiles à départager. Expliquez votre projet à Alex. UNPRO analyse vos besoins et vous aide à identifier le professionnel qui correspond réellement à vos critères.",
      ctaPrimary: "Trouver mon PRO",
      ctaSecondary: "J'ai déjà des soumissions",
      microcopy:
        "Gratuit pour les propriétaires · Entrepreneurs vérifiés lorsque la vérification est confirmée · Rendez-vous exclusifs",
    },
    probleme: {
      title: "Vous ne cherchez pas trois prix.",
      titleAccent: "Vous cherchez le bon entrepreneur.",
      body: "Le modèle traditionnel vous oblige à chercher, appeler, expliquer votre projet plusieurs fois, attendre les retours et recevoir plusieurs entrepreneurs avant de tenter de déterminer lequel choisir. UNPRO fonctionne autrement.",
      steps: ["Votre projet", "Analyse IA", "Bon PRO", "Rendez-vous"],
    },
    alex: {
      title: "Parlez de votre projet.",
      titleAccent: "Alex s'occupe du reste.",
      body: "Décrivez simplement vos travaux comme si vous parliez à quelqu'un. Alex vous pose quelques questions pour comprendre ce qui compte réellement avant de rechercher les entrepreneurs compatibles avec votre projet.",
      dimensions: [
        "Type de travaux",
        "Propriété",
        "Localisation",
        "Budget",
        "Échéancier",
        "Priorités",
        "Besoins particuliers",
      ],
      note: "Une question à la fois. Jamais un long formulaire.",
      cta: "Parler à Alex",
    },
    modele: {
      title: "Avant, Internet vous donnait des listes.",
      titleAccent: "Maintenant, l'IA peut vous aider à choisir.",
      body: "Les moteurs de recherche vous aident à trouver des entreprises. Les plateformes de soumissions transmettent souvent votre demande à plusieurs entrepreneurs. UNPRO cherche plutôt à répondre à une question beaucoup plus utile :",
      statement: "« Qui est le bon PRO pour mon projet? »",
      after:
        "UNPRO analyse la compatibilité entre votre projet et les entrepreneurs disponibles afin de réduire la recherche et vous orienter vers une meilleure correspondance.",
    },
    recommander: {
      title: "Une recommandation basée sur plus qu'une publicité.",
      body: "UNPRO construit une compréhension structurée des entrepreneurs et de leurs activités afin de mieux déterminer pour quels projets ils peuvent être pertinents.",
      dimensions: [
        "Spécialités",
        "Types de travaux",
        "Territoires desservis",
        "Projets recherchés",
        "Qualifications",
        "Réputation",
        "Disponibilité lorsque connue",
        "Compatibilité avec le projet",
      ],
      provenanceTitle: "Comment nous qualifions l'information",
      provenance: [
        { label: "Vérifié", body: "Information confirmée par UNPRO ou une source admissible." },
        { label: "Déclaré", body: "Information fournie par l'entreprise." },
        { label: "Inféré", body: "Information déterminée à partir de données disponibles." },
        { label: "En attente", body: "Information qui reste à confirmer." },
      ],
    },
    comparaison: {
      title: "Vous avez déjà reçu des soumissions?",
      subtitle: "Ne choisissez pas seulement le prix le plus bas.",
      body: "Téléversez vos soumissions et utilisez UNPRO pour mieux comprendre ce qui les différencie.",
      items: [
        "Prix",
        "Travaux inclus",
        "Exclusions",
        "Matériaux",
        "Garanties",
        "Différences importantes",
        "Éléments potentiellement manquants",
      ],
      cta: "Comparer mes soumissions",
    },
    passeport: {
      title: "Et votre maison commence à se souvenir.",
      body: "Avec le Passeport Maison UNPRO, conservez progressivement l'historique utile de votre propriété : travaux, documents, soumissions, inspections, garanties et informations importantes.",
      cta: "Découvrir le Passeport Maison",
    },
    entrepreneurs: {
      title: "Vous êtes entrepreneur?",
      subtitle:
        "Demain, vos clients ne chercheront plus seulement qui apparaît en premier. Ils demanderont à l'IA qui elle recommande.",
      body: "Découvrez comment UNPRO comprend actuellement votre entreprise, complétez votre profil et améliorez les informations utilisées pour vous associer aux bons projets.",
      ctaPrimary: "Voir mon profil IA",
      ctaSecondary: "Activer mon profil pour 1 $",
      note: "L'activation à 1 $ est optionnelle.",
    },
    final: {
      title: "Arrêtez de chercher trois entrepreneurs.",
      titleAccent: "Trouvez le bon.",
      body: "Expliquez votre projet à Alex et laissez UNPRO réduire la recherche.",
      cta: "Trouver mon PRO",
      signature: "UNPRO — La fin des 3 soumissions.",
    },
  },
  en: {
    hero: {
      eyebrow: "UNPRO + ALEX",
      title: "THE END OF THE 3-QUOTE RUNAROUND.",
      subtitle: "AI helps find the right contractor for your project.",
      body: "No more calling several companies, repeating your project over and over and trying to compare quotes that never line up. Tell Alex about your project. UNPRO analyses what you need and helps you identify the professional who actually fits your criteria.",
      ctaPrimary: "Find my PRO",
      ctaSecondary: "I already have quotes",
      microcopy:
        "Free for homeowners · Contractors shown as verified only once verification is confirmed · Exclusive appointments",
    },
    probleme: {
      title: "You're not looking for three prices.",
      titleAccent: "You're looking for the right contractor.",
      body: "The traditional model makes you search, call, explain your project several times, wait for callbacks and host multiple contractors before trying to figure out who to pick. UNPRO works differently.",
      steps: ["Your project", "AI analysis", "The right PRO", "Appointment"],
    },
    alex: {
      title: "Talk about your project.",
      titleAccent: "Alex takes it from there.",
      body: "Describe the work the way you'd explain it to someone. Alex asks a few questions to understand what really matters before looking for contractors that fit your project.",
      dimensions: [
        "Type of work",
        "Property",
        "Location",
        "Budget",
        "Timeline",
        "Priorities",
        "Specific needs",
      ],
      note: "One question at a time. Never a long form.",
      cta: "Talk to Alex",
    },
    modele: {
      title: "The web used to hand you lists.",
      titleAccent: "Now AI can help you choose.",
      body: "Search engines help you find companies. Quote platforms usually forward your request to several contractors. UNPRO tries to answer a far more useful question:",
      statement: "\u201cWho is the right PRO for my project?\u201d",
      after:
        "UNPRO analyses the fit between your project and available contractors to narrow the search and point you toward a better match.",
    },
    recommander: {
      title: "A recommendation built on more than advertising.",
      body: "UNPRO builds a structured understanding of contractors and their activity to better determine which projects they may be relevant for.",
      dimensions: [
        "Specialties",
        "Types of work",
        "Service areas",
        "Projects sought",
        "Qualifications",
        "Reputation",
        "Availability when known",
        "Fit with your project",
      ],
      provenanceTitle: "How we qualify information",
      provenance: [
        { label: "Verified", body: "Information confirmed by UNPRO or an eligible source." },
        { label: "Declared", body: "Information provided by the company." },
        { label: "Inferred", body: "Information derived from available data." },
        { label: "Pending", body: "Information still to be confirmed." },
      ],
    },
    comparaison: {
      title: "Already received quotes?",
      subtitle: "Don't pick on lowest price alone.",
      body: "Upload your quotes and use UNPRO to better understand what sets them apart.",
      items: [
        "Price",
        "Work included",
        "Exclusions",
        "Materials",
        "Warranties",
        "Key differences",
        "Potentially missing items",
      ],
      cta: "Compare my quotes",
    },
    passeport: {
      title: "And your home starts to remember.",
      body: "With the UNPRO Home Passport, gradually keep the useful history of your property: work done, documents, quotes, inspections, warranties and important details.",
      cta: "Discover the Home Passport",
    },
    entrepreneurs: {
      title: "Are you a contractor?",
      subtitle:
        "Tomorrow, your clients won't just look at who shows up first. They'll ask AI who it recommends.",
      body: "See how UNPRO currently understands your business, complete your profile and improve the information used to match you with the right projects.",
      ctaPrimary: "See my AI profile",
      ctaSecondary: "Activate my profile for $1",
      note: "The $1 activation is optional.",
    },
    final: {
      title: "Stop chasing three contractors.",
      titleAccent: "Find the right one.",
      body: "Tell Alex about your project and let UNPRO narrow the search.",
      cta: "Find my PRO",
      signature: "UNPRO — The end of the 3-quote runaround.",
    },
  },
} as const;

export type HomeFin3Copy = (typeof homeFin3)["fr"];

export function useHomeFin3Copy(lang: Lang): HomeFin3Copy {
  return (lang === "en" ? homeFin3.en : homeFin3.fr) as HomeFin3Copy;
}
