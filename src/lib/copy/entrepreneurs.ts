/**
 * UNPRO — Entrepreneur Messaging System (Single Source of Truth)
 *
 * Centralized strategic copywriting for the entrepreneur surface.
 * Positions UNPRO as AI infrastructure, NOT a lead generation platform.
 *
 * RULES:
 *  - Never use: "leads", "obtenez des leads", "soumissions gratuites",
 *    "annuaire", "marketing facile", "boostez votre SEO".
 *  - Always use: "opportunités", "rendez-vous qualifiés", "visibilité IA",
 *    "recommandations", "compatibilité", "priorité territoriale".
 *
 * Import this anywhere you need entrepreneur-facing strings.
 */

export type MessagingContext =
  | "default"
  | "roofing"
  | "insulation"
  | "luxury"
  | "commercial"
  | "emergency"
  | "founders"
  | "territoryScarcity";

export const entrepreneurMessaging = {
  hero: {
    variants: {
      A: {
        title: "Faites partie de l'élite en rénovation et construction.",
        subtitle:
          "UNPRO recommande votre entreprise aux bons propriétaires, au bon moment — selon votre métier, votre secteur et vos disponibilités.",
      },
      B: {
        title: "Soyez recommandé aux bons propriétaires, au bon moment.",
        subtitle:
          "L'IA d'UNPRO oriente les propriétaires sérieux vers les entrepreneurs les plus compatibles. Pas de comparateur. Pas d'enchère. Une recommandation.",
      },
      C: {
        title: "Arrêtez de courir après les contrats.",
        subtitle:
          "UNPRO vous envoie des rendez-vous qualifiés avec des propriétaires prêts à avancer.",
      },
      D: {
        title:
          "L'IA recommande déjà des entrepreneurs. Recommande-t-elle votre entreprise?",
        subtitle:
          "Activez votre visibilité IA et entrez dans le moteur de recommandation UNPRO.",
      },
      E: {
        title:
          "Votre visibilité Google ne suffit plus.",
        subtitle:
          "Les moteurs IA changent déjà la façon dont les propriétaires choisissent leurs entrepreneurs. UNPRO est l'infrastructure qui vous y positionne.",
      },
    },
    default: "B" as const,
    promise: "Des rendez-vous exclusifs garantis. Pas des leads partagés.",
  },

  onboarding: {
    welcome: "Activez votre profil dans l'écosystème IA UNPRO.",
    capacityQuestion: "Combien de projets pouvez-vous gérer par mois?",
    territoryNotice:
      "Les places sont limitées par métier et par territoire pour préserver la valeur de chaque recommandation.",
    finalStep: "Activer mon profil",
  },

  pricing: {
    title: "Choisissez votre niveau de visibilité IA.",
    subtitle:
      "Chaque plan ouvre un niveau de priorité, de compatibilité et d'exclusivité territoriale.",
    valueAxes: [
      "Visibilité IA et présence dans les recommandations",
      "Priorité territoriale et exclusivité par métier",
      "Compatibilité projet ↔ entrepreneur",
      "Rendez-vous qualifiés (pas des leads partagés)",
      "Optimisation continue de votre score AIPP",
    ],
    ctaPrimary: "Activer mes rendez-vous",
    ctaSecondary: "Voir mes opportunités",
  },

  scarcity: {
    placesLeft: (n: number, city: string) =>
      `${n} place${n > 1 ? "s" : ""} restante${n > 1 ? "s" : ""} à ${city}.`,
    territoryLocking: (city: string) =>
      `Le territoire ${city} sera bientôt verrouillé.`,
    trade: (trade: string, city: string) =>
      `Recommandations limitées en ${trade} à ${city}.`,
    saturation: "Saturation concurrentielle atteinte dans plusieurs secteurs.",
    founderPriority: "Priorité Fondateur — accès verrouillé 10 ans.",
    regionalExclusivity: "Exclusivité régionale active sur votre métier.",
  },

  trust: {
    aiRecommended: "Recommandé par l'IA",
    highVisibility: "Visibilité IA élevée",
    optimizedTerritory: "Territoire optimisé",
    verifiedProfile: "Profil vérifié",
    fastResponse: "Réponse rapide",
    highCompatibility: "Forte compatibilité",
    availableThisWeek: "Disponible cette semaine",
    localPriority: "Priorité locale",
    eliteUnpro: "Élite UNPRO",
    aippOptimized: "AIPP Optimisé",
  },

  aiVisibility: {
    label: "Visibilité IA",
    description:
      "Mesure votre présence dans les moteurs de recommandation IA des propriétaires.",
    boost: "Augmenter ma visibilité IA",
  },

  appointments: {
    label: "Rendez-vous qualifiés",
    exclusive: "Rendez-vous exclusif",
    confirmedTitle: "Rendez-vous confirmé avec un propriétaire sérieux",
    activateCta: "Activer mes rendez-vous",
  },

  territory: {
    label: "Territoire",
    coverage: "Couverture territoriale",
    lockedOnYou: "Territoire verrouillé sur votre entreprise",
    competitionLow: "Faible compétition locale",
    competitionHigh: "Compétition locale élevée — visibilité critique",
  },

  elite: {
    title: "Élite UNPRO",
    description:
      "Le cercle restreint d'entrepreneurs recommandés en priorité par l'IA dans leur territoire.",
    cta: "Rejoindre l'élite",
  },

  fallback: {
    generic: "L'IA continue d'analyser les signaux locaux.",
    quietTerritory: "Votre territoire est actuellement calme.",
    noMatch:
      "Aucune opportunité compatible détectée pour le moment.",
  },

  emptyStates: {
    appointments: {
      title: "Aucune opportunité compatible pour le moment.",
      body: "L'IA continue d'analyser les signaux des propriétaires de votre territoire. Vous serez recommandé dès qu'un projet correspond.",
    },
    pipeline: {
      title: "Votre flux IA est calme.",
      body: "Augmentez votre visibilité IA pour entrer dans plus de recommandations.",
    },
    matches: {
      title: "Aucun match récent.",
      body: "Optimisez votre profil et votre score AIPP pour augmenter votre compatibilité.",
    },
    territory: {
      title: "Territoire en analyse.",
      body: "UNPRO cartographie la demande et la compétition locales.",
    },
  },

  emails: {
    aiVisibility: {
      subject: (city: string) => `Votre visibilité IA à ${city} est prête.`,
      preheader:
        "Découvrez comment les propriétaires vous perçoivent réellement.",
    },
    weeklyRecap: {
      subject: "Vos opportunités UNPRO de la semaine",
      preheader: "Recommandations, compatibilité et activité IA dans votre territoire.",
    },
  },

  sms: {
    aiCheck: (firstName: string, city: string) =>
      `${firstName}, l'IA recommande-t-elle votre entreprise ou celle de vos concurrents à ${city}?`,
    appointment: (firstName: string) =>
      `${firstName}, un rendez-vous qualifié vous est recommandé. Consultez votre dashboard UNPRO.`,
  },

  notifications: {
    newOpportunity: "Nouvelle opportunité compatible détectée.",
    aippDrop: "Votre score AIPP a diminué — votre visibilité IA est à risque.",
    territoryAlert: "Un concurrent vient d'augmenter sa visibilité dans votre territoire.",
    eliteUnlocked: "Vous venez d'entrer dans l'Élite UNPRO.",
  },

  /**
   * CTA replacement map — apply throughout the codebase.
   * Use replaceLegacyCta(label) for legacy strings, or import directly.
   */
  cta: {
    activateAppointments: "Activer mes rendez-vous",
    seeOpportunities: "Voir mes opportunités",
    beRecommended: "Être recommandé",
    activateAiVisibility: "Activer ma visibilité IA",
    reserveMyPlace: "Réserver ma place",
    activateMyProfile: "Activer mon profil",
    continue: "Continuer",
    activate: "Activer",
    increaseVisibility: "Augmenter ma visibilité",
    talkToAlex: "Parler à Alex",
  },

  /**
   * Strategic blocks — why entrepreneurs lose contracts + how UNPRO changes it.
   */
  strategic: {
    whyLost: {
      title: "Pourquoi les entrepreneurs perdent des contrats",
      causes: [
        "Comparaisons de prix infinies",
        "Mauvais timing — propriétaire pas encore prêt",
        "Propriétaires non qualifiés",
        "Visibilité IA inexistante",
        "Territoires saturés",
        "Manque de confiance numérique",
      ],
    },
    howUnpro: {
      title: "Comment UNPRO change le système",
      pillars: [
        "Matching intelligent par projet et compatibilité",
        "Recommandations IA aux bons propriétaires",
        "Signaux d'intention détectés en temps réel",
        "Compatibilité projet ↔ entrepreneur",
        "Exclusivité territoriale par métier",
        "Priorisation des meilleurs entrepreneurs",
      ],
    },
  },
} as const;

/**
 * Legacy CTA replacement map.
 * Use to migrate hardcoded strings progressively.
 */
export const LEGACY_CTA_MAP: Record<string, string> = {
  "Obtenir des leads": entrepreneurMessaging.cta.activateAppointments,
  "Recevoir des leads": entrepreneurMessaging.cta.activateAppointments,
  "Voir les plans": entrepreneurMessaging.cta.seeOpportunities,
  "Recevoir des clients": entrepreneurMessaging.cta.beRecommended,
  "Générer des leads": entrepreneurMessaging.cta.activateAiVisibility,
  "S'inscrire": entrepreneurMessaging.cta.reserveMyPlace,
  "Commencer": entrepreneurMessaging.cta.activateMyProfile,
  "Soumettre": entrepreneurMessaging.cta.continue,
  "Acheter": entrepreneurMessaging.cta.activate,
  "Upgrade": entrepreneurMessaging.cta.increaseVisibility,
};

export function replaceLegacyCta(label: string): string {
  return LEGACY_CTA_MAP[label] ?? label;
}

/**
 * Dashboard label remapping.
 */
export const DASHBOARD_LABEL_MAP: Record<string, string> = {
  Leads: "Opportunités",
  Conversion: "Compatibilité",
  Pipeline: "Flux IA",
  Acquisition: "Recommandations",
  Trafic: "Visibilité IA",
  "Performance SEO": "Présence IA",
  Contacts: "Propriétaires intéressés",
};

export function remapDashboardLabel(label: string): string {
  return DASHBOARD_LABEL_MAP[label] ?? label;
}

/**
 * Resolve a contextual hero variant (future-proof for trade/territory/plan).
 */
export function resolveHeroVariant(
  context: MessagingContext = "default"
): { title: string; subtitle: string } {
  const v = entrepreneurMessaging.hero.variants;
  switch (context) {
    case "founders":
      return v.A;
    case "territoryScarcity":
      return v.E;
    case "emergency":
      return v.C;
    case "luxury":
      return v.A;
    case "commercial":
      return v.D;
    case "roofing":
    case "insulation":
    default:
      return v[entrepreneurMessaging.hero.default];
  }
}
