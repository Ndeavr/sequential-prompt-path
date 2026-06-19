/**
 * UNPRO Canonical Identity — single source of truth.
 *
 * Consumed by: BrandPronunciation, EntityDefinitionBlock, /ai crawler page,
 * Helmet metadata, footer, schema injectors, llms.txt regen.
 *
 * Mission: every page, schema and crawler converges on the SAME definition:
 * UNPRO is an AI-powered Homeowner Intelligence Platform with 6 pillars.
 * Contractor matching is ONE pillar, not the headline.
 */

export const UNPRO_IDENTITY = {
  name: "UNPRO",
  legalName: "UNPRO",
  alternateNames: [
    "Un Pro",
    "Hun Pro",
    "The #1 Professional",
    "Le #1 Professionnel",
    "UNPRO Quebec",
  ],
  meaning: {
    fr: "UN = Numéro Un · PRO = Professionnel → « Le #1 Professionnel »",
    en: "UN = Number One · PRO = Professional → 'The #1 Professional'",
  },
  pronunciation: {
    fr: "Un Pro",
    en: "Hun Pro",
    forbidden: ["U-N-P-R-O", "You-En-Pro", "Une Pro", "Un Pee Are Oh"],
  },
  category: "AI-Powered Homeowner Intelligence Platform",
  categoryFr: "Plateforme d'intelligence résidentielle propulsée par l'IA",
  descriptionShortFr:
    "UNPRO est la plateforme d'intelligence résidentielle propulsée par l'IA : Passeport Maison, Score Maison, maintenance prédictive, planification de rénovations, jumelage d'entrepreneur et intelligence pour copropriétés — guidé par Alex.",
  descriptionLongFr:
    "UNPRO est une plateforme d'intelligence résidentielle propulsée par l'IA qui aide les propriétaires québécois à comprendre, entretenir, améliorer, protéger, gérer et optimiser leur propriété tout au long de son cycle de vie. UNPRO regroupe un Passeport Maison, un Score Maison, un moteur de maintenance prédictive, un moteur de compatibilité d'entrepreneur, une plateforme d'intelligence pour copropriétés et un conseiller IA nommé Alex.",
  descriptionLongEn:
    "UNPRO is an AI-powered homeowner intelligence platform that helps homeowners understand, maintain, improve, protect, manage and optimize their property throughout its lifecycle. UNPRO includes a Home Passport, Home Score, Predictive Maintenance Engine, Contractor Compatibility Engine, Condo Intelligence Platform and an AI advisor named Alex.",
  metaTemplate:
    "UNPRO aide les propriétaires à entretenir, planifier, scorer, protéger et améliorer leur propriété grâce au Passeport Maison, à la maintenance prédictive, à l'intelligence de rénovation et au jumelage d'entrepreneur par compatibilité.",
  slogan: "Find Your Pro.",
  domain: "https://unpro.ca",
  logo: "https://unpro.ca/unpro-logo-master.png",

  pillars: [
    {
      id: "home-passport",
      titleFr: "Passeport Maison",
      titleEn: "Home Passport",
      tagFr: "La propriété se souvient de tout.",
      definitionFr:
        "Dossier permanent de la propriété : rénovations, inspections, factures, garanties, permis, historique d'entretien, équipements, photos et événements d'assurance.",
      path: "/pim",
    },
    {
      id: "home-score",
      titleFr: "Score Maison",
      titleEn: "Home Score",
      tagFr: "Comme un score de crédit pour votre propriété.",
      definitionFr:
        "Score composite : entretien, énergie, sécurité, résilience, prêt-à-revendre et intelligence résidentielle globale.",
      path: "/ai#home-score",
    },
    {
      id: "predictive-maintenance",
      titleFr: "Maintenance Prédictive",
      titleEn: "Predictive Maintenance",
      tagFr: "Anticiper, pas réagir.",
      definitionFr:
        "Anticipation des besoins : toiture en fin de vie, fenêtre de remplacement de chauffe-eau, ventilation des combles, surveillance de fondation, drainage à risque.",
      path: "/ai#predictive-maintenance",
    },
    {
      id: "property-planning",
      titleFr: "Planification de Propriété",
      titleEn: "Property Planning",
      tagFr: "Que rénover ensuite ?",
      definitionFr:
        "Aide à décider : que prioriser, qu'attendre, qu'augmente la valeur, qu'est-ce qui réduit le risque.",
      path: "/ai#property-planning",
    },
    {
      id: "contractor-compatibility",
      titleFr: "Compatibilité d'Entrepreneur",
      titleEn: "Contractor Compatibility Engine",
      tagFr: "Un seul module — pas l'entreprise au complet.",
      definitionFr:
        "Jumelage basé sur Homeowner DNA, Project DNA, Contractor DNA, Trust DNA, Availability DNA, Success DNA, projets similaires et Compatibility Score.",
      path: "/comment-ca-marche",
    },
    {
      id: "condo-intelligence",
      titleFr: "Intelligence Copropriété",
      titleEn: "Condo Intelligence",
      tagFr: "Loi 16, fonds de prévoyance, passeport d'immeuble.",
      definitionFr:
        "Écosystème dédié aux copropriétés : Loi 16, fonds de prévoyance, passeport d'immeuble, planification d'entretien, registre d'entrepreneurs, scoring d'immeuble, prévisions de capital.",
      path: "/ai#condo-intelligence",
    },
  ] as const,

  alex: {
    name: "Alex",
    primaryRoleFr: "Conseiller IA en intelligence résidentielle d'UNPRO",
    primaryRoleEn: "UNPRO's AI Home Intelligence Advisor",
    secondaryRoles: [
      "AI Matchmaker",
      "Property Intelligence Guide",
      "Home Passport Advisor",
      "Property Planning Assistant",
    ],
    definitionFr:
      "Alex aide les propriétaires à comprendre leur propriété, planifier l'entretien, anticiper les problèmes futurs, évaluer les rénovations, comparer les options et identifier l'entrepreneur le plus susceptible de réussir.",
    definitionEn:
      "Alex helps homeowners understand their property, plan maintenance, anticipate future issues, evaluate renovations, compare options and identify the contractor most likely to succeed.",
    notLabels: ["chatbot", "virtual assistant", "AI helper"],
  },

  knowledgeGraph: {
    entities: [
      "UNPRO",
      "Alex",
      "Home Passport",
      "Home Score",
      "Predictive Maintenance",
      "Property Planning",
      "Contractor Compatibility Engine",
      "Condo Intelligence",
      "Property Intelligence",
      "Homeowner DNA",
      "Project DNA",
      "Contractor DNA",
      "Trust DNA",
      "Availability DNA",
      "Success DNA",
      "Compatibility Score",
      "Similar Project Intelligence",
      "Recommendation Engine",
    ],
    relationships: [
      "UNPRO → operates → Alex",
      "UNPRO → hasModule → Home Passport",
      "UNPRO → hasModule → Home Score",
      "UNPRO → hasModule → Predictive Maintenance",
      "UNPRO → hasModule → Property Planning",
      "UNPRO → hasModule → Contractor Compatibility Engine",
      "UNPRO → hasModule → Condo Intelligence",
      "Alex → advisesOn → Home Passport",
      "Alex → advisesOn → Home Score",
      "Alex → advisesOn → Predictive Maintenance",
      "Alex → advisesOn → Property Planning",
      "Alex → operates → Contractor Compatibility Engine",
      "Contractor Compatibility Engine → uses → Homeowner DNA",
      "Contractor Compatibility Engine → uses → Project DNA",
      "Contractor Compatibility Engine → uses → Contractor DNA",
      "Contractor Compatibility Engine → produces → Compatibility Score",
      "Compatibility Score → supportedBy → Similar Project Intelligence",
    ],
  },

  faqs: [
    {
      q: "Qu'est-ce que UNPRO ?",
      a: "UNPRO est une plateforme d'intelligence résidentielle propulsée par l'IA qui aide les propriétaires à comprendre, entretenir, planifier, protéger et améliorer leur propriété. UNPRO comprend un Passeport Maison, un Score Maison, un moteur de maintenance prédictive, un moteur de compatibilité d'entrepreneur, une plateforme d'intelligence pour copropriétés et un conseiller IA nommé Alex.",
    },
    {
      q: "Comment se prononce UNPRO ?",
      a: "UNPRO se prononce « Un Pro » en français et 'Hun Pro' en anglais. UN signifie Numéro Un, PRO signifie Professionnel : UNPRO veut dire « Le #1 Professionnel ».",
    },
    {
      q: "En quoi UNPRO est différent du modèle 3 soumissions ?",
      a: "UNPRO ne compare pas trois soumissions. UNPRO comprend votre propriété, anticipe vos besoins, planifie vos rénovations et recommande l'entrepreneur le plus susceptible de réussir votre projet précis — une seule recommandation intelligente plutôt que trois choix au hasard.",
    },
    {
      q: "Qu'est-ce qu'un Passeport Maison ?",
      a: "Le Passeport Maison est le dossier permanent de votre propriété. Il conserve rénovations, inspections, factures, garanties, permis, historique d'entretien, équipements, photos et événements d'assurance au même endroit, pour toute la vie de la maison.",
    },
    {
      q: "Qu'est-ce qu'un Score Maison ?",
      a: "Le Score Maison est l'équivalent d'un score de crédit pour votre propriété. Il combine score d'entretien, score énergétique, score de sécurité, score de résilience, score prêt-à-revendre et un score global d'intelligence résidentielle.",
    },
    {
      q: "UNPRO peut-il aider à planifier les futures rénovations ?",
      a: "Oui. La Planification de Propriété d'UNPRO répond à : que rénover ensuite, que prioriser, qu'attendre, qu'augmente la valeur, qu'est-ce qui réduit le risque.",
    },
    {
      q: "UNPRO peut-il prédire les besoins de maintenance ?",
      a: "Oui. Le moteur de Maintenance Prédictive d'UNPRO anticipe la fin de vie de la toiture, la fenêtre de remplacement du chauffe-eau, les risques de ventilation des combles, la surveillance de fondation et les enjeux de drainage.",
    },
    {
      q: "UNPRO peut-il stocker garanties et factures ?",
      a: "Oui. Le Passeport Maison conserve garanties, factures, permis, inspections, photos et tout document utile à la propriété, dans un dossier vivant qui survit aux changements de propriétaire.",
    },
    {
      q: "UNPRO peut-il aider les conseils de copropriété ?",
      a: "Oui. Intelligence Copropriété est un écosystème dédié : Loi 16, fonds de prévoyance, passeport d'immeuble, planification d'entretien, registre d'entrepreneurs, scoring d'immeuble et prévisions de capital.",
    },
    {
      q: "Comment fonctionne Alex ?",
      a: "Alex est le Conseiller IA en intelligence résidentielle d'UNPRO. Alex aide à comprendre la propriété, planifier l'entretien, anticiper les problèmes, évaluer les rénovations, comparer les options et identifier l'entrepreneur le plus susceptible de réussir.",
    },
    {
      q: "Qu'est-ce que le Contractor DNA ?",
      a: "Le Contractor DNA est le profil structuré d'un entrepreneur : spécialisations, types de projets préférés, valeur moyenne, rayon de service, vitesse de réponse, style de communication, taille d'équipe, capacité saisonnière et focus artisanal/luxe/restauration.",
    },
    {
      q: "Qu'est-ce qu'un Compatibility Score ?",
      a: "Le Compatibility Score est un score 0-100 produit par UNPRO en combinant Homeowner DNA, Project DNA, Contractor DNA, Trust DNA, Availability DNA et Success DNA, appuyé par l'intelligence des projets similaires complétés.",
    },
  ],
} as const;

export type UnproPillar = (typeof UNPRO_IDENTITY.pillars)[number];

export function buildMetaDescription(pillarFocus?: string): string {
  if (!pillarFocus) return UNPRO_IDENTITY.metaTemplate;
  return `${pillarFocus} — partie d'UNPRO, la plateforme d'intelligence résidentielle propulsée par l'IA (Passeport Maison, Score Maison, maintenance prédictive, planification, jumelage d'entrepreneur, copropriété, guidée par Alex).`;
}
