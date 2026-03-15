/**
 * UNPRO — Verification SEO Data
 * Trades + content templates for programmatic verification pages.
 */

export interface VerificationTrade {
  slug: string;
  name: string;
  name_plural: string;
  /** Used in titles like "Vérifier un {label} à {city}" */
  label: string;
  risks_fr: string[];
  what_unpro_checks_fr: string[];
  common_mistakes_fr: string[];
  related_services: string[];
}

export const VERIFICATION_TRADES: VerificationTrade[] = [
  {
    slug: "entrepreneur",
    name: "Entrepreneur",
    name_plural: "Entrepreneurs",
    label: "entrepreneur",
    risks_fr: [
      "Numéro de licence RBQ inexistant ou expiré",
      "Entreprise non enregistrée au REQ",
      "Assurance responsabilité absente ou insuffisante",
      "Soumission vague sans détail des travaux",
      "Identité commerciale difficile à confirmer en ligne",
    ],
    what_unpro_checks_fr: [
      "Correspondance entre le nom d'entreprise et les registres publics",
      "Validité et portée de la licence RBQ",
      "Cohérence entre le site web, le téléphone et l'adresse",
      "Présence et authenticité des avis en ligne",
      "Qualité et complétude des soumissions soumises",
    ],
    common_mistakes_fr: [
      "Se fier uniquement au bouche-à-oreille sans vérification",
      "Accepter une soumission verbale sans document écrit",
      "Ne pas vérifier si la licence RBQ couvre le type de travaux",
      "Payer un dépôt important avant le début des travaux",
      "Ne pas demander de preuve d'assurance",
    ],
    related_services: ["couvreur", "plomberie", "electricite", "renovation-salle-de-bain"],
  },
  {
    slug: "couvreur",
    name: "Couvreur",
    name_plural: "Couvreurs",
    label: "couvreur",
    risks_fr: [
      "Couvreur sans sous-catégorie RBQ appropriée pour la toiture",
      "Garantie sur les matériaux non transférable",
      "Travaux réalisés sans permis municipal",
      "Drainage et ventilation d'entretoit négligés",
    ],
    what_unpro_checks_fr: [
      "Licence RBQ avec sous-catégorie toiture",
      "Historique de réclamations et avis vérifiés",
      "Cohérence entre la soumission et les pratiques du marché",
      "Présence d'assurance responsabilité professionnelle",
    ],
    common_mistakes_fr: [
      "Choisir uniquement sur le prix le plus bas",
      "Ne pas vérifier la sous-catégorie RBQ du couvreur",
      "Ignorer la ventilation lors d'un remplacement de toiture",
      "Accepter une soumission sans détail des matériaux",
    ],
    related_services: ["isolation-entretoit", "gouttiere", "inspection-batiment"],
  },
  {
    slug: "isolation",
    name: "Entrepreneur en isolation",
    name_plural: "Entrepreneurs en isolation",
    label: "compagnie d'isolation",
    risks_fr: [
      "Isolant non conforme aux normes du Code du bâtiment",
      "Absence de test d'infiltrométrie après les travaux",
      "Ventilation d'entretoit compromise par l'isolant",
      "Entreprise sans licence RBQ valide",
    ],
    what_unpro_checks_fr: [
      "Licence RBQ couvrant les travaux d'isolation",
      "Certifications en efficacité énergétique",
      "Références vérifiables sur des projets similaires",
      "Soumission détaillant le type et l'épaisseur de l'isolant",
    ],
    common_mistakes_fr: [
      "Choisir un isolant inadapté au climat québécois",
      "Négliger la ventilation lors de l'ajout d'isolation",
      "Ne pas vérifier l'admissibilité aux subventions avant les travaux",
      "Faire affaire avec un installateur non licencié",
    ],
    related_services: ["ventilation-entretoit", "couvreur", "thermopompe"],
  },
  {
    slug: "plombier",
    name: "Plombier",
    name_plural: "Plombiers",
    label: "plombier",
    risks_fr: [
      "Plombier sans compagnonnage ou licence appropriée",
      "Travaux non conformes au Code de plomberie",
      "Aucune garantie écrite sur les réparations",
      "Matériaux de qualité inférieure non identifiés dans la soumission",
    ],
    what_unpro_checks_fr: [
      "Licence RBQ et carte de compétence",
      "Assurance responsabilité valide",
      "Détail des matériaux dans la soumission",
      "Cohérence des prix avec le marché local",
    ],
    common_mistakes_fr: [
      "Engager un plombier sans vérifier sa carte de compétence",
      "Accepter un prix verbal sans soumission détaillée",
      "Ne pas demander les codes de conformité applicables",
      "Ignorer les signes de problèmes sous-jacents",
    ],
    related_services: ["renovation-salle-de-bain", "chauffe-eau", "drain-francais"],
  },
  {
    slug: "electricien",
    name: "Électricien",
    name_plural: "Électriciens",
    label: "électricien",
    risks_fr: [
      "Travaux électriques sans licence ni inspection ESA",
      "Panneau électrique non conforme aux normes actuelles",
      "Câblage dangereux dissimulé derrière les murs",
      "Absence de certificat de conformité après les travaux",
    ],
    what_unpro_checks_fr: [
      "Licence d'entrepreneur en électricité valide",
      "Certification de maître électricien",
      "Conformité avec le Code de construction du Québec",
      "Références et avis vérifiés",
    ],
    common_mistakes_fr: [
      "Faire réaliser des travaux électriques par un non-licencié",
      "Ne pas demander l'inspection ESA après les travaux",
      "Accepter un branchement temporaire comme solution permanente",
      "Ignorer la capacité du panneau électrique existant",
    ],
    related_services: ["panneau-electrique", "eclairage", "thermopompe"],
  },
  {
    slug: "renovation",
    name: "Entrepreneur en rénovation",
    name_plural: "Entrepreneurs en rénovation",
    label: "entrepreneur en rénovation",
    risks_fr: [
      "Portée de la licence RBQ ne couvrant pas tous les travaux",
      "Sous-traitants non licenciés engagés sans votre accord",
      "Échéancier irréaliste sans pénalité de retard",
      "Soumission globale sans ventilation des coûts",
    ],
    what_unpro_checks_fr: [
      "Licence RBQ et sous-catégories couvertes",
      "Politique de sous-traitance documentée",
      "Qualité et détail de la soumission",
      "Portfolio de projets similaires vérifiable",
    ],
    common_mistakes_fr: [
      "Ne pas clarifier qui fait quoi (entrepreneur vs sous-traitant)",
      "Signer un contrat sans échéancier de paiement clair",
      "Omettre de vérifier la portée exacte de la licence",
      "Ne pas documenter l'état des lieux avant les travaux",
    ],
    related_services: ["renovation-salle-de-bain", "renovation-cuisine", "agrandissement"],
  },
];

/** Generate dynamic FAQs for a city + trade combo */
export function generateVerificationFaqs(
  cityName: string,
  trade: VerificationTrade
): { question: string; answer: string; topics: string[] }[] {
  return [
    {
      question: `Comment vérifier un ${trade.label} à ${cityName} ?`,
      answer: `Utilisez l'outil de vérification UnPRO pour entrer le nom, le numéro de téléphone, le site web ou le numéro RBQ de l'${trade.label}. UnPRO croise les informations publiques et internes pour évaluer la cohérence de l'identité commerciale.`,
      topics: ["verification", trade.slug],
    },
    {
      question: `Comment trouver le numéro RBQ d'un ${trade.label} ?`,
      answer: `Le numéro RBQ apparaît généralement sur la soumission, le contrat ou le site web de l'entreprise. Vous pouvez aussi le chercher sur le registre de la RBQ. UnPRO vérifie automatiquement ce numéro lorsqu'il est disponible.`,
      topics: ["verification", "rbq", trade.slug],
    },
    {
      question: `Est-ce qu'un numéro de téléphone suffit pour identifier un ${trade.label} ?`,
      answer: `Un numéro de téléphone seul offre un signal limité. UnPRO le croise avec d'autres données (nom d'entreprise, site web, adresse) pour estimer la cohérence. Plus vous fournissez d'informations, plus l'analyse est fiable.`,
      topics: ["verification", trade.slug],
    },
    {
      question: `Peut-on vérifier un ${trade.label} à partir d'une soumission ?`,
      answer: `Oui. Téléversez la soumission dans UnPRO et notre moteur d'analyse évalue la qualité du document, extrait les informations d'identité et les compare aux données connues.`,
      topics: ["verification", "soumission", trade.slug],
    },
    {
      question: `Que faire si les informations d'un ${trade.label} sont contradictoires ?`,
      answer: `Des informations contradictoires méritent attention. UnPRO signale les incohérences détectées et recommande de demander des clarifications directement à l'entrepreneur avant de signer.`,
      topics: ["verification", trade.slug],
    },
    {
      question: `Est-ce que « Validé par UnPRO » signifie certifié légalement ?`,
      answer: `Non. « Validé par UnPRO » signifie que notre équipe a revu le profil et que les informations disponibles sont cohérentes. Ce n'est pas une certification légale ni un remplacement de la vérification RBQ officielle.`,
      topics: ["verification", "trust"],
    },
  ];
}
