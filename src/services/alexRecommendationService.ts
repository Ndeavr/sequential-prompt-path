/**
 * UNPRO — Alex Recommendation Service
 * Generates next-step recommendations based on intent and context.
 */

import type { AlexIntent } from "./alexIntentService";

export interface AlexRecommendation {
  title: string;
  description: string;
  ctaLabel: string;
  ctaLink: string;
  icon: "search" | "upload" | "calendar" | "home" | "chart" | "star";
}

export const getRecommendations = (
  intent: AlexIntent,
  context?: {
    hasProperties?: boolean;
    hasQuotes?: boolean;
    category?: string | null;
  }
): AlexRecommendation[] => {
  const recs: AlexRecommendation[] = [];

  switch (intent) {
    case "find_contractor":
      recs.push({
        title: "Rechercher des entrepreneurs",
        description: "Trouvez des professionnels vérifiés dans votre région.",
        ctaLabel: "Lancer la recherche",
        ctaLink: context?.category ? `/search?specialty=${context.category}` : "/search",
        icon: "search",
      });
      if (!context?.hasProperties) {
        recs.push({
          title: "Ajouter votre propriété",
          description: "Ajoutez votre propriété pour des recommandations personnalisées.",
          ctaLabel: "Ajouter",
          ctaLink: "/dashboard/properties/new",
          icon: "home",
        });
      }
      break;

    case "analyze_quote":
      recs.push({
        title: "Téléverser une soumission",
        description: "Notre IA analysera votre soumission et vous donnera un avis.",
        ctaLabel: "Téléverser",
        ctaLink: "/dashboard/quotes/upload",
        icon: "upload",
      });
      if (context?.hasQuotes) {
        recs.push({
          title: "Voir mes soumissions",
          description: "Consultez vos soumissions déjà analysées.",
          ctaLabel: "Voir",
          ctaLink: "/dashboard/quotes",
          icon: "chart",
        });
      }
      break;

    case "book_appointment":
      recs.push({
        title: "Trouver un entrepreneur",
        description: "Cherchez un professionnel pour prendre rendez-vous.",
        ctaLabel: "Rechercher",
        ctaLink: "/search",
        icon: "search",
      });
      recs.push({
        title: "Mes rendez-vous",
        description: "Consultez vos rendez-vous existants.",
        ctaLabel: "Voir",
        ctaLink: "/dashboard/appointments",
        icon: "calendar",
      });
      break;

    case "home_maintenance":
    case "property_improvement":
      if (context?.hasProperties) {
        recs.push({
          title: "Score Maison",
          description: "Vérifiez l'état général de votre propriété.",
          ctaLabel: "Voir le score",
          ctaLink: "/dashboard/home-score",
          icon: "chart",
        });
        recs.push({
          title: "Insights propriété",
          description: "Découvrez les recommandations pour votre propriété.",
          ctaLabel: "Voir les insights",
          ctaLink: "/dashboard/properties",
          icon: "star",
        });
      } else {
        recs.push({
          title: "Ajouter votre propriété",
          description: "Commencez par ajouter votre propriété pour des recommandations personnalisées.",
          ctaLabel: "Ajouter",
          ctaLink: "/dashboard/properties/new",
          icon: "home",
        });
      }
      break;

    case "describe_project":
      recs.push({
        title: "Rechercher un professionnel",
        description: "Trouvez l'entrepreneur adapté à votre projet.",
        ctaLabel: "Rechercher",
        ctaLink: context?.category ? `/search?specialty=${context.category}` : "/search",
        icon: "search",
      });
      recs.push({
        title: "Demander une soumission",
        description: "Téléversez une soumission existante pour analyse.",
        ctaLabel: "Téléverser",
        ctaLink: "/dashboard/quotes/upload",
        icon: "upload",
      });
      break;

    default:
      recs.push({
        title: "Explorer la plateforme",
        description: "Découvrez comment UNPRO peut vous aider.",
        ctaLabel: "Rechercher des entrepreneurs",
        ctaLink: "/search",
        icon: "search",
      });
      if (!context?.hasProperties) {
        recs.push({
          title: "Ajouter votre propriété",
          description: "Commencez par ajouter votre propriété.",
          ctaLabel: "Ajouter",
          ctaLink: "/dashboard/properties/new",
          icon: "home",
        });
      }
      break;
  }

  return recs;
};
