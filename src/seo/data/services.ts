/**
 * UNPRO — SEO Service Categories
 * Structured service metadata for programmatic SEO pages.
 */

export interface SeoService {
  slug: string;
  name: string;
  shortDescription: string;
  whyItMatters: string;
  pricingFactors: string[];
  whenToAct: string[];
  contractorType: string;
  relatedProblems: string[];
  relatedServices: string[];
}

export const SEO_SERVICES: SeoService[] = [
  {
    slug: "isolation-entretoit",
    name: "Isolation d'entretoit",
    shortDescription: "L'isolation de l'entretoit est l'un des investissements les plus rentables pour réduire vos coûts de chauffage et prévenir les problèmes d'humidité.",
    whyItMatters: "Un entretoit mal isolé peut représenter jusqu'à 25 % des pertes de chaleur d'une maison. En hiver québécois, cela se traduit par des factures d'énergie élevées, des barrages de glace sur le toit et un risque accru de condensation et de moisissure.",
    pricingFactors: [
      "Superficie de l'entretoit",
      "Type d'isolant choisi (cellulose, laine, polyuréthane)",
      "Accessibilité de l'entretoit",
      "Retrait d'ancien isolant contaminé",
      "Correction de ventilation nécessaire",
    ],
    whenToAct: [
      "Factures de chauffage anormalement élevées",
      "Barrages de glace récurrents sur le toit",
      "Température inégale entre les étages",
      "Entretoit visiblement sous-isolé (moins de 16 pouces)",
    ],
    contractorType: "isolation",
    relatedProblems: ["moisissure-grenier", "barrage-glace", "condensation-entretoit"],
    relatedServices: ["ventilation-entretoit", "couvreur", "inspection-batiment"],
  },
  {
    slug: "couvreur",
    name: "Couvreur / Toiture",
    shortDescription: "Un couvreur professionnel assure l'étanchéité et la durabilité de votre toit, votre première ligne de défense contre les intempéries.",
    whyItMatters: "Le toit protège l'ensemble de votre propriété. Une toiture vieillissante ou mal entretenue peut causer des infiltrations d'eau, de la moisissure structurelle et une dévaluation importante de votre propriété.",
    pricingFactors: [
      "Superficie du toit",
      "Type de revêtement (bardeaux, membrane, tôle)",
      "Pente et complexité du toit",
      "Retrait de couches existantes",
      "Réparations de structure sous-jacente",
    ],
    whenToAct: [
      "Bardeaux gondolés, fissurés ou manquants",
      "Taches d'eau au plafond après la pluie",
      "Toiture de plus de 20 ans sans inspection récente",
      "Mousse ou végétation visible sur le toit",
    ],
    contractorType: "couvreur",
    relatedProblems: ["infiltration-eau-toit", "barrage-glace", "fuite-toiture"],
    relatedServices: ["isolation-entretoit", "gouttiere", "inspection-batiment"],
  },
  {
    slug: "renovation-salle-de-bain",
    name: "Rénovation de salle de bain",
    shortDescription: "Modernisez votre salle de bain pour améliorer confort, fonctionnalité et valeur de revente de votre propriété.",
    whyItMatters: "La salle de bain est l'une des pièces les plus utilisées et les plus sujettes aux problèmes d'humidité. Une rénovation bien planifiée prévient les dommages d'eau cachés et augmente significativement la valeur de revente.",
    pricingFactors: [
      "Superficie et configuration",
      "Qualité des matériaux et finitions",
      "Remplacement de plomberie",
      "Travaux électriques",
      "Imperméabilisation et ventilation",
    ],
    whenToAct: [
      "Carrelage fissuré ou joints noircis",
      "Odeurs persistantes d'humidité",
      "Plomberie vieillissante avec fuites",
      "Ventilation inadéquate (condensation fréquente)",
    ],
    contractorType: "renovation",
    relatedProblems: ["moisissure-salle-de-bain", "fuite-plomberie"],
    relatedServices: ["plomberie", "electricite", "ventilation-entretoit"],
  },
  {
    slug: "plomberie",
    name: "Plomberie",
    shortDescription: "Un plombier qualifié résout vos problèmes d'eau courante, de drainage et de chauffage hydronique avec fiabilité.",
    whyItMatters: "Les problèmes de plomberie non traités peuvent causer des dégâts d'eau majeurs, de la moisissure et des risques sanitaires. Une intervention rapide protège votre propriété et votre santé.",
    pricingFactors: [
      "Type d'intervention (réparation vs remplacement)",
      "Accessibilité des tuyaux",
      "Matériaux (cuivre, PEX, fonte)",
      "Urgence de l'intervention",
    ],
    whenToAct: [
      "Fuite visible ou tache d'eau",
      "Baisse de pression d'eau inexpliquée",
      "Drains lents ou bouchés récurrents",
      "Tuyaux de plus de 40 ans",
    ],
    contractorType: "plombier",
    relatedProblems: ["fuite-plomberie", "refoulement-egout"],
    relatedServices: ["renovation-salle-de-bain", "drain-francais"],
  },
  {
    slug: "drain-francais",
    name: "Drain français",
    shortDescription: "Le drain français protège les fondations de votre maison contre les infiltrations d'eau souterraine et l'accumulation d'humidité.",
    whyItMatters: "Un drain français défaillant peut mener à des infiltrations au sous-sol, de la moisissure, des fissures de fondation et une dégradation structurelle coûteuse à réparer.",
    pricingFactors: [
      "Longueur du périmètre à drainer",
      "Profondeur d'excavation",
      "Accessibilité du terrain",
      "Membrane et gravier requis",
      "Restauration du terrain après travaux",
    ],
    whenToAct: [
      "Humidité ou eau au sous-sol après la pluie",
      "Odeur de moisi persistante au sous-sol",
      "Drain existant de plus de 25 ans",
      "Fissures de fondation visibles",
    ],
    contractorType: "fondation",
    relatedProblems: ["infiltration-sous-sol", "fissure-fondation"],
    relatedServices: ["impermeabilisation-fondation", "plomberie"],
  },
  {
    slug: "electricite",
    name: "Électricité",
    shortDescription: "Un électricien certifié assure la sécurité et la conformité de votre installation électrique résidentielle.",
    whyItMatters: "Un système électrique vétuste ou non conforme représente un risque d'incendie et d'électrocution. Les mises à niveau améliorent aussi la capacité pour les appareils modernes.",
    pricingFactors: [
      "Ampleur des travaux (panneau, câblage, prises)",
      "Mise aux normes requise",
      "Accessibilité des circuits",
      "Ajout de circuits dédiés",
    ],
    whenToAct: [
      "Disjoncteurs qui sautent fréquemment",
      "Prises sans mise à la terre",
      "Panneau électrique de plus de 30 ans",
      "Fils d'aluminium (pré-1975)",
    ],
    contractorType: "electricien",
    relatedProblems: ["panneau-electrique-vetuste"],
    relatedServices: ["renovation-salle-de-bain", "inspection-batiment"],
  },
];

export const getServiceBySlug = (slug: string): SeoService | undefined =>
  SEO_SERVICES.find((s) => s.slug === slug);
