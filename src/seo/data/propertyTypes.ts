/**
 * UNPRO — SEO Property Types Data
 * Comprehensive property type definitions for programmatic SEO page generation.
 * Supports 10K+ unique pages via city × type × problem combinations.
 */

export type PropertyFamily = "single_family" | "condominium_strata" | "multi_family";

export interface SeoPropertyType {
  slug: string;
  family: PropertyFamily;
  nameFr: string;
  nameEn: string;
  urlSlug: string; // URL-safe slug for routes
  aliases: string[];
  shortDescriptionFr: string;
  popularityScore: number; // 0-100
  commercialScore: number; // 0-100
  seoPriorityScore: number; // 0-100
  isMultiUnit: boolean;
  requiresRegulatoryAttention: boolean;
  /** Top problems specific to this property type */
  topProblems: SeoPropertyTypeProblem[];
  /** Contractor categories boosted for this type */
  contractorBoosts: string[];
  /** Content block variations for unique page generation */
  contentVariations: {
    introTemplates: string[];
    whyItHappensTemplates: string[];
    seasonalTips: string[];
    ctaVariations: string[];
  };
}

export interface SeoPropertyTypeProblem {
  slug: string;
  nameFr: string;
  urgencyScore: number; // 1-10
  costLow: number;
  costHigh: number;
  costUnit: string;
  seoKeyword: string;
  commercialIntent: "high" | "medium" | "low";
  bestSeason: string;
  contractorCategory: string;
}

// ─── Property Family Labels ──────────────────────────────────────────
export const PROPERTY_FAMILY_LABELS: Record<PropertyFamily, string> = {
  single_family: "Unifamiliale",
  condominium_strata: "Condo / Copropriété",
  multi_family: "Multilogement",
};

// ─── Complete Property Type Definitions ──────────────────────────────

export const SEO_PROPERTY_TYPES: SeoPropertyType[] = [
  // ── SINGLE FAMILY ──────────────────────────────────────────────────
  {
    slug: "bungalow",
    family: "single_family",
    nameFr: "Bungalow",
    nameEn: "Bungalow",
    urlSlug: "bungalow",
    aliases: ["plain-pied", "maison plain-pied", "maison de plain-pied"],
    shortDescriptionFr: "Maison de plain-pied, un seul niveau habitable avec sous-sol. Type de propriété le plus courant au Québec.",
    popularityScore: 95,
    commercialScore: 85,
    seoPriorityScore: 90,
    isMultiUnit: false,
    requiresRegulatoryAttention: false,
    topProblems: [
      { slug: "perte-chaleur-grenier", nameFr: "Perte de chaleur par le grenier", urgencyScore: 7, costLow: 1500, costHigh: 6000, costUnit: "projet", seoKeyword: "perte chaleur grenier bungalow", commercialIntent: "high", bestSeason: "Automne", contractorCategory: "isolation" },
      { slug: "isolation-insuffisante", nameFr: "Isolation insuffisante", urgencyScore: 6, costLow: 2000, costHigh: 8000, costUnit: "projet", seoKeyword: "isolation bungalow", commercialIntent: "high", bestSeason: "Automne", contractorCategory: "isolation" },
      { slug: "humidite-sous-sol", nameFr: "Humidité au sous-sol", urgencyScore: 8, costLow: 3000, costHigh: 15000, costUnit: "projet", seoKeyword: "humidite sous-sol bungalow", commercialIntent: "high", bestSeason: "Printemps", contractorCategory: "fondation" },
      { slug: "drain-francais", nameFr: "Drain français défectueux", urgencyScore: 9, costLow: 8000, costHigh: 25000, costUnit: "projet", seoKeyword: "drain francais bungalow", commercialIntent: "high", bestSeason: "Été", contractorCategory: "fondation" },
      { slug: "fondation-fissures", nameFr: "Fissures de fondation", urgencyScore: 9, costLow: 2000, costHigh: 12000, costUnit: "projet", seoKeyword: "fissure fondation bungalow", commercialIntent: "high", bestSeason: "Été", contractorCategory: "fondation" },
      { slug: "toiture-fin-de-vie", nameFr: "Toiture en fin de vie", urgencyScore: 8, costLow: 5000, costHigh: 15000, costUnit: "projet", seoKeyword: "toiture bungalow", commercialIntent: "high", bestSeason: "Été", contractorCategory: "toiture" },
    ],
    contractorBoosts: ["isolation", "fondation", "toiture", "plomberie"],
    contentVariations: {
      introTemplates: [
        "Le bungalow est le type de propriété le plus répandu au Québec. Sa structure de plain-pied avec sous-sol présente des défis uniques en matière d'isolation et de fondation.",
        "Propriétaire d'un bungalow ? Ce type de maison, très populaire au Québec, nécessite une attention particulière au niveau du grenier, du sous-sol et de la toiture.",
      ],
      whyItHappensTemplates: [
        "Les bungalows construits avant 1990 ont souvent une isolation insuffisante dans l'entretoit, ce qui cause des pertes de chaleur importantes et des barrages de glace en hiver.",
        "La configuration de plain-pied rend les bungalows particulièrement vulnérables aux problèmes de sous-sol : humidité, fissures de fondation et infiltration d'eau.",
      ],
      seasonalTips: [
        "Inspectez votre entretoit à l'automne avant les premiers gels.",
        "Vérifiez les gouttières et les margelles de fenêtres au printemps.",
        "Planifiez les travaux de fondation entre mai et octobre.",
      ],
      ctaVariations: [
        "Trouvez un entrepreneur spécialisé en bungalow près de chez vous.",
        "Obtenez une soumission gratuite pour votre bungalow.",
        "Décrivez votre problème de bungalow et recevez des recommandations personnalisées.",
      ],
    },
  },
  {
    slug: "cottage",
    family: "single_family",
    nameFr: "Cottage",
    nameEn: "Cottage / Two-storey",
    urlSlug: "cottage",
    aliases: ["maison à étages", "maison deux étages", "maison 2 étages"],
    shortDescriptionFr: "Maison à deux étages ou plus. Présente des défis de chauffage et ventilation entre les niveaux.",
    popularityScore: 80,
    commercialScore: 80,
    seoPriorityScore: 75,
    isMultiUnit: false,
    requiresRegulatoryAttention: false,
    topProblems: [
      { slug: "chauffage-inegal", nameFr: "Chauffage inégal entre étages", urgencyScore: 5, costLow: 1000, costHigh: 8000, costUnit: "projet", seoKeyword: "chauffage inegal cottage", commercialIntent: "medium", bestSeason: "Automne", contractorCategory: "chauffage" },
      { slug: "isolation-murs", nameFr: "Isolation des murs", urgencyScore: 6, costLow: 3000, costHigh: 12000, costUnit: "projet", seoKeyword: "isolation murs cottage", commercialIntent: "high", bestSeason: "Automne", contractorCategory: "isolation" },
      { slug: "fenetres-inefficaces", nameFr: "Fenêtres inefficaces", urgencyScore: 5, costLow: 500, costHigh: 1500, costUnit: "fenêtre", seoKeyword: "remplacement fenetres cottage", commercialIntent: "high", bestSeason: "Été", contractorCategory: "fenetres" },
      { slug: "toiture-cottage", nameFr: "Toiture à pentes multiples", urgencyScore: 8, costLow: 8000, costHigh: 25000, costUnit: "projet", seoKeyword: "toiture cottage", commercialIntent: "high", bestSeason: "Été", contractorCategory: "toiture" },
      { slug: "ventilation-salle-bain", nameFr: "Ventilation salle de bain", urgencyScore: 4, costLow: 500, costHigh: 3000, costUnit: "projet", seoKeyword: "ventilation salle bain cottage", commercialIntent: "medium", bestSeason: "Toute l'année", contractorCategory: "ventilation" },
    ],
    contractorBoosts: ["chauffage", "isolation", "toiture", "fenetres"],
    contentVariations: {
      introTemplates: [
        "Le cottage à deux étages est un classique de l'architecture résidentielle québécoise. Sa configuration à niveaux multiples crée des défis spécifiques de chauffage et ventilation.",
        "Vous possédez un cottage ? Les maisons à étages nécessitent une attention particulière à l'équilibre thermique entre les niveaux.",
      ],
      whyItHappensTemplates: [
        "La chaleur monte naturellement, créant un déséquilibre entre l'étage et le rez-de-chaussée. Cela surcharge le système de chauffage et crée de l'inconfort.",
        "Les cottages ont souvent plus de surface de murs extérieurs, ce qui augmente les pertes thermiques si l'isolation n'est pas optimale.",
      ],
      seasonalTips: [
        "Équilibrez vos registres de chauffage à chaque changement de saison.",
        "Vérifiez l'état des fenêtres à l'étage, souvent négligées.",
      ],
      ctaVariations: [
        "Trouvez le bon entrepreneur pour votre cottage.",
        "Obtenez une évaluation énergétique pour votre maison à étages.",
      ],
    },
  },
  {
    slug: "chalet",
    family: "single_family",
    nameFr: "Chalet",
    nameEn: "Chalet / Cottage",
    urlSlug: "chalet",
    aliases: ["chalet 3 saisons", "chalet 4 saisons", "maison de campagne"],
    shortDescriptionFr: "Propriété de villégiature, souvent saisonnière. Défis uniques liés à l'humidité, au gel-dégel et aux systèmes autonomes.",
    popularityScore: 60,
    commercialScore: 70,
    seoPriorityScore: 65,
    isMultiUnit: false,
    requiresRegulatoryAttention: false,
    topProblems: [
      { slug: "humidite-chalet", nameFr: "Humidité et moisissure", urgencyScore: 7, costLow: 1000, costHigh: 8000, costUnit: "projet", seoKeyword: "humidite chalet", commercialIntent: "high", bestSeason: "Printemps", contractorCategory: "renovation" },
      { slug: "isolation-4-saisons", nameFr: "Isolation pour 4 saisons", urgencyScore: 6, costLow: 5000, costHigh: 20000, costUnit: "projet", seoKeyword: "isolation chalet 4 saisons", commercialIntent: "high", bestSeason: "Été", contractorCategory: "isolation" },
      { slug: "fosse-septique", nameFr: "Fosse septique", urgencyScore: 8, costLow: 5000, costHigh: 25000, costUnit: "projet", seoKeyword: "fosse septique chalet", commercialIntent: "high", bestSeason: "Été", contractorCategory: "plomberie" },
      { slug: "puits-artesien", nameFr: "Puits artésien", urgencyScore: 7, costLow: 3000, costHigh: 12000, costUnit: "projet", seoKeyword: "puits artesien chalet", commercialIntent: "medium", bestSeason: "Été", contractorCategory: "plomberie" },
      { slug: "gel-degel", nameFr: "Dommages gel-dégel", urgencyScore: 8, costLow: 2000, costHigh: 15000, costUnit: "projet", seoKeyword: "gel degel chalet fondation", commercialIntent: "high", bestSeason: "Printemps", contractorCategory: "fondation" },
    ],
    contractorBoosts: ["renovation", "isolation", "plomberie", "fondation"],
    contentVariations: {
      introTemplates: [
        "Les chalets du Québec font face à des conditions climatiques extrêmes, surtout ceux situés en zone rurale avec des systèmes autonomes (fosse septique, puits).",
        "Que votre chalet soit 3 ou 4 saisons, il nécessite un entretien adapté aux cycles de gel-dégel et à l'humidité saisonnière.",
      ],
      whyItHappensTemplates: [
        "Les chalets restent souvent inoccupés en hiver sans chauffage minimal, ce qui cause de l'humidité, de la condensation et de la moisissure au printemps.",
        "Les systèmes autonomes (fosse septique, puits) nécessitent un entretien régulier qui est souvent négligé dans les propriétés de villégiature.",
      ],
      seasonalTips: [
        "Préparez votre chalet pour l'hiver : vidangez la plomberie, coupez l'eau, maintenez un chauffage minimal.",
        "Au printemps, inspectez la fondation pour les dommages de gel-dégel avant d'ouvrir la plomberie.",
      ],
      ctaVariations: [
        "Trouvez un entrepreneur qui connaît les chalets de votre région.",
        "Planifiez votre inspection printanière de chalet.",
      ],
    },
  },
  {
    slug: "bi_generation",
    family: "single_family",
    nameFr: "Maison bi-génération",
    nameEn: "Intergenerational Home",
    urlSlug: "maison-bi-generation",
    aliases: ["intergénération", "bigénération", "maison intergénérationnelle"],
    shortDescriptionFr: "Maison avec deux logements distincts ou semi-distincts pour accueillir deux générations. Enjeux de conformité, insonorisation et autonomie des espaces.",
    popularityScore: 55,
    commercialScore: 90,
    seoPriorityScore: 92,
    isMultiUnit: false,
    requiresRegulatoryAttention: true,
    topProblems: [
      { slug: "conformite-logement-secondaire", nameFr: "Conformité du logement secondaire", urgencyScore: 9, costLow: 5000, costHigh: 30000, costUnit: "projet", seoKeyword: "conformite bi-generation", commercialIntent: "high", bestSeason: "Toute l'année", contractorCategory: "entrepreneur_general" },
      { slug: "insonorisation-bi-generation", nameFr: "Insonorisation entre zones", urgencyScore: 7, costLow: 3000, costHigh: 15000, costUnit: "projet", seoKeyword: "insonorisation maison bi-generation", commercialIntent: "high", bestSeason: "Toute l'année", contractorCategory: "renovation" },
      { slug: "entree-independante", nameFr: "Entrée indépendante", urgencyScore: 6, costLow: 5000, costHigh: 20000, costUnit: "projet", seoKeyword: "entree independante bi-generation", commercialIntent: "high", bestSeason: "Été", contractorCategory: "entrepreneur_general" },
      { slug: "plomberie-double-usage", nameFr: "Plomberie double usage", urgencyScore: 7, costLow: 3000, costHigh: 12000, costUnit: "projet", seoKeyword: "plomberie double bi-generation", commercialIntent: "high", bestSeason: "Toute l'année", contractorCategory: "plomberie" },
      { slug: "chauffage-multi-zone", nameFr: "Chauffage multi-zone", urgencyScore: 6, costLow: 3000, costHigh: 15000, costUnit: "projet", seoKeyword: "chauffage multi zone bi-generation", commercialIntent: "high", bestSeason: "Automne", contractorCategory: "chauffage" },
      { slug: "securite-incendie-bi-generation", nameFr: "Sécurité incendie", urgencyScore: 10, costLow: 1000, costHigh: 8000, costUnit: "projet", seoKeyword: "securite incendie bi-generation", commercialIntent: "high", bestSeason: "Toute l'année", contractorCategory: "entrepreneur_general" },
    ],
    contractorBoosts: ["entrepreneur_general", "inspecteur_batiment", "plombier", "chauffage", "ventilation"],
    contentVariations: {
      introTemplates: [
        "La maison bi-génération offre une solution familiale de plus en plus populaire au Québec, mais elle vient avec des exigences réglementaires et techniques complexes.",
        "Transformer ou maintenir une maison bi-génération exige une attention particulière à la conformité municipale, l'insonorisation et l'autonomie des espaces.",
      ],
      whyItHappensTemplates: [
        "Beaucoup de bi-générations ont été aménagées sans permis ou sans respecter les normes de conformité municipale, créant des risques juridiques et de sécurité.",
        "L'insonorisation entre les deux zones de vie est souvent le problème numéro un des propriétaires de bi-générations, surtout dans les conversions de sous-sol.",
      ],
      seasonalTips: [
        "Vérifiez que votre logement bi-génération est conforme aux normes municipales de votre ville.",
        "Faites inspecter les détecteurs de fumée et le système de ventilation des deux unités annuellement.",
      ],
      ctaVariations: [
        "Trouvez un entrepreneur spécialisé en maisons bi-génération.",
        "Vérifiez la conformité de votre bi-génération avec un inspecteur certifié.",
        "Obtenez un plan d'insonorisation adapté à votre configuration.",
      ],
    },
  },
  {
    slug: "jumele",
    family: "single_family",
    nameFr: "Jumelé",
    nameEn: "Semi-detached",
    urlSlug: "jumele",
    aliases: ["maison jumelée", "semi-détaché"],
    shortDescriptionFr: "Maison partageant un mur mitoyen. Enjeux d'insonorisation et de coordination avec le voisin.",
    popularityScore: 50,
    commercialScore: 60,
    seoPriorityScore: 50,
    isMultiUnit: false,
    requiresRegulatoryAttention: false,
    topProblems: [
      { slug: "insonorisation-mur-mitoyen", nameFr: "Insonorisation du mur mitoyen", urgencyScore: 6, costLow: 2000, costHigh: 10000, costUnit: "projet", seoKeyword: "insonorisation jumele", commercialIntent: "high", bestSeason: "Toute l'année", contractorCategory: "renovation" },
      { slug: "toiture-jumele", nameFr: "Toiture partagée", urgencyScore: 7, costLow: 4000, costHigh: 12000, costUnit: "projet", seoKeyword: "toiture jumele", commercialIntent: "high", bestSeason: "Été", contractorCategory: "toiture" },
      { slug: "fondation-jumele", nameFr: "Fondation mitoyenne", urgencyScore: 8, costLow: 3000, costHigh: 15000, costUnit: "projet", seoKeyword: "fondation jumele", commercialIntent: "high", bestSeason: "Été", contractorCategory: "fondation" },
    ],
    contractorBoosts: ["renovation", "toiture", "fondation"],
    contentVariations: {
      introTemplates: ["Le jumelé est une option abordable populaire au Québec, mais le mur mitoyen crée des défis uniques d'insonorisation et de coordination."],
      whyItHappensTemplates: ["Le mur mitoyen transmet le bruit et les vibrations, et les travaux de toiture ou fondation nécessitent souvent une coordination avec le voisin."],
      seasonalTips: ["Coordonnez les travaux de toiture avec votre voisin pour partager les coûts de mobilisation."],
      ctaVariations: ["Trouvez un entrepreneur qui a l'habitude des jumelés."],
    },
  },
  {
    slug: "maison_rangee",
    family: "single_family",
    nameFr: "Maison en rangée",
    nameEn: "Townhouse",
    urlSlug: "maison-en-rangee",
    aliases: ["maison de ville", "townhouse"],
    shortDescriptionFr: "Maison attachée en rangée avec murs mitoyens des deux côtés. Défis de ventilation et mitoyenneté.",
    popularityScore: 40,
    commercialScore: 55,
    seoPriorityScore: 45,
    isMultiUnit: false,
    requiresRegulatoryAttention: false,
    topProblems: [
      { slug: "ventilation-maison-rangee", nameFr: "Ventilation insuffisante", urgencyScore: 6, costLow: 1500, costHigh: 6000, costUnit: "projet", seoKeyword: "ventilation maison rangee", commercialIntent: "medium", bestSeason: "Toute l'année", contractorCategory: "ventilation" },
      { slug: "insonorisation-rangee", nameFr: "Insonorisation murs mitoyens", urgencyScore: 6, costLow: 3000, costHigh: 12000, costUnit: "projet", seoKeyword: "insonorisation maison rangee", commercialIntent: "high", bestSeason: "Toute l'année", contractorCategory: "renovation" },
    ],
    contractorBoosts: ["renovation", "ventilation"],
    contentVariations: {
      introTemplates: ["La maison en rangée est un choix urbain populaire, mais la mitoyenneté des deux côtés crée des enjeux de ventilation et d'insonorisation."],
      whyItHappensTemplates: ["Avec des murs mitoyens des deux côtés, la circulation d'air est limitée, nécessitant souvent un système de ventilation mécanique."],
      seasonalTips: ["Vérifiez votre VRC (ventilateur récupérateur de chaleur) deux fois par an."],
      ctaVariations: ["Trouvez un expert en ventilation pour maison en rangée."],
    },
  },
  {
    slug: "split_level",
    family: "single_family",
    nameFr: "Split level",
    nameEn: "Split Level",
    urlSlug: "split-level",
    aliases: ["niveau partagé", "split-level"],
    shortDescriptionFr: "Maison à niveaux décalés. Configuration unique qui crée des défis de chauffage et d'humidité.",
    popularityScore: 30,
    commercialScore: 50,
    seoPriorityScore: 40,
    isMultiUnit: false,
    requiresRegulatoryAttention: false,
    topProblems: [
      { slug: "chauffage-split-level", nameFr: "Chauffage entre niveaux", urgencyScore: 5, costLow: 2000, costHigh: 8000, costUnit: "projet", seoKeyword: "chauffage split level", commercialIntent: "medium", bestSeason: "Automne", contractorCategory: "chauffage" },
      { slug: "humidite-niveau-bas", nameFr: "Humidité au niveau bas", urgencyScore: 7, costLow: 2000, costHigh: 10000, costUnit: "projet", seoKeyword: "humidite split level", commercialIntent: "high", bestSeason: "Printemps", contractorCategory: "fondation" },
    ],
    contractorBoosts: ["chauffage", "fondation"],
    contentVariations: {
      introTemplates: ["Le split-level est un design architectural distinctif avec ses niveaux décalés, mais cette configuration crée des zones thermiques complexes."],
      whyItHappensTemplates: ["Les niveaux décalés créent des zones thermiques naturellement différentes, avec le niveau le plus bas souvent plus froid et humide."],
      seasonalTips: ["Équilibrez les registres de chauffage entre les niveaux à chaque saison."],
      ctaVariations: ["Trouvez un expert en chauffage multi-zone pour votre split-level."],
    },
  },
  {
    slug: "shoebox",
    family: "single_family",
    nameFr: "Shoebox",
    nameEn: "Shoebox",
    urlSlug: "shoebox",
    aliases: [],
    shortDescriptionFr: "Petit bâtiment résidentiel montréalais typique, souvent un ancien duplex converti. Défis d'espace et de mise à jour.",
    popularityScore: 25,
    commercialScore: 45,
    seoPriorityScore: 35,
    isMultiUnit: false,
    requiresRegulatoryAttention: false,
    topProblems: [
      { slug: "mise-a-jour-electrique", nameFr: "Mise à jour électrique", urgencyScore: 8, costLow: 3000, costHigh: 10000, costUnit: "projet", seoKeyword: "electricite shoebox montreal", commercialIntent: "high", bestSeason: "Toute l'année", contractorCategory: "electricite" },
      { slug: "isolation-shoebox", nameFr: "Isolation déficiente", urgencyScore: 6, costLow: 2000, costHigh: 8000, costUnit: "projet", seoKeyword: "isolation shoebox", commercialIntent: "medium", bestSeason: "Automne", contractorCategory: "isolation" },
    ],
    contractorBoosts: ["electricite", "isolation", "renovation"],
    contentVariations: {
      introTemplates: ["Le shoebox montréalais est un patrimoine architectural unique mais ses systèmes sont souvent obsolètes et nécessitent des mises à jour."],
      whyItHappensTemplates: ["Ces maisons, souvent centenaires, ont des systèmes électriques et d'isolation qui ne répondent plus aux normes actuelles."],
      seasonalTips: ["Faites vérifier votre panneau électrique si votre shoebox a plus de 40 ans."],
      ctaVariations: ["Trouvez un électricien spécialisé en bâtiments anciens."],
    },
  },

  // ── CONDOMINIUM / STRATA ───────────────────────────────────────────
  {
    slug: "condo_divise",
    family: "condominium_strata",
    nameFr: "Condo divise",
    nameEn: "Divided Condo",
    urlSlug: "condo-divise",
    aliases: ["copropriété divise", "condominium", "condo"],
    shortDescriptionFr: "Copropriété divise avec syndicat, parties communes et fonds de prévoyance. Soumis à la Loi 16.",
    popularityScore: 75,
    commercialScore: 85,
    seoPriorityScore: 80,
    isMultiUnit: false,
    requiresRegulatoryAttention: true,
    topProblems: [
      { slug: "loi-16-etude-fonds", nameFr: "Conformité Loi 16 / Étude de fonds", urgencyScore: 9, costLow: 5000, costHigh: 25000, costUnit: "immeuble", seoKeyword: "loi 16 condo", commercialIntent: "high", bestSeason: "Toute l'année", contractorCategory: "inspecteur_batiment" },
      { slug: "fonds-prevoyance", nameFr: "Fonds de prévoyance insuffisant", urgencyScore: 7, costLow: 0, costHigh: 0, costUnit: "unité/mois", seoKeyword: "fonds prevoyance condo", commercialIntent: "medium", bestSeason: "Toute l'année", contractorCategory: "inspecteur_batiment" },
      { slug: "infiltration-balcon-condo", nameFr: "Infiltration par le balcon", urgencyScore: 8, costLow: 2000, costHigh: 15000, costUnit: "unité", seoKeyword: "infiltration balcon condo", commercialIntent: "high", bestSeason: "Printemps", contractorCategory: "entrepreneur_general" },
      { slug: "degats-eau-condo", nameFr: "Dégâts d'eau entre unités", urgencyScore: 9, costLow: 1000, costHigh: 20000, costUnit: "sinistre", seoKeyword: "degat eau condo", commercialIntent: "high", bestSeason: "Toute l'année", contractorCategory: "plomberie" },
      { slug: "parties-communes", nameFr: "Entretien parties communes", urgencyScore: 5, costLow: 500, costHigh: 5000, costUnit: "par année", seoKeyword: "entretien parties communes condo", commercialIntent: "medium", bestSeason: "Toute l'année", contractorCategory: "entrepreneur_general" },
    ],
    contractorBoosts: ["inspecteur_batiment", "entrepreneur_general", "plomberie"],
    contentVariations: {
      introTemplates: [
        "La copropriété divise au Québec est soumise à des règles strictes, incluant la Loi 16 qui exige des études de fonds de prévoyance et des carnets d'entretien.",
        "Propriétaire de condo ? La gestion des parties communes et la conformité à la Loi 16 sont des enjeux majeurs pour votre copropriété.",
      ],
      whyItHappensTemplates: [
        "Beaucoup de copropriétés n'ont pas encore complété leur étude de fonds de prévoyance exigée par la Loi 16, créant un risque financier pour les copropriétaires.",
        "Les infiltrations entre unités sont le problème numéro un des copropriétés : balcons, toitures-terrasses et plomberie vieillissante.",
      ],
      seasonalTips: [
        "Vérifiez avec votre syndicat si l'étude de fonds de prévoyance est à jour.",
        "Inspectez les balcons au printemps pour détecter les fissures avant les pluies.",
      ],
      ctaVariations: [
        "Trouvez un inspecteur certifié pour votre copropriété.",
        "Planifiez votre étude de fonds de prévoyance (Loi 16).",
      ],
    },
  },
  {
    slug: "condo_indivise",
    family: "condominium_strata",
    nameFr: "Condo indivise",
    nameEn: "Undivided Condo",
    urlSlug: "condo-indivise",
    aliases: ["copropriété indivise", "indivis"],
    shortDescriptionFr: "Copropriété indivise sans syndicat formel. Financement complexe et responsabilités partagées entre copropriétaires.",
    popularityScore: 35,
    commercialScore: 75,
    seoPriorityScore: 78,
    isMultiUnit: false,
    requiresRegulatoryAttention: true,
    topProblems: [
      { slug: "financement-indivise", nameFr: "Financement hypothécaire difficile", urgencyScore: 6, costLow: 0, costHigh: 0, costUnit: "n/a", seoKeyword: "financement condo indivise", commercialIntent: "high", bestSeason: "Toute l'année", contractorCategory: "inspecteur_batiment" },
      { slug: "quote-part-travaux", nameFr: "Quote-part et travaux partagés", urgencyScore: 7, costLow: 500, costHigh: 20000, costUnit: "par copropriétaire", seoKeyword: "quote part travaux indivise", commercialIntent: "medium", bestSeason: "Toute l'année", contractorCategory: "entrepreneur_general" },
      { slug: "assurances-indivise", nameFr: "Assurances complexes", urgencyScore: 5, costLow: 0, costHigh: 0, costUnit: "n/a", seoKeyword: "assurance condo indivise", commercialIntent: "medium", bestSeason: "Toute l'année", contractorCategory: "inspecteur_batiment" },
      { slug: "conflits-indivision", nameFr: "Conflits entre copropriétaires", urgencyScore: 6, costLow: 0, costHigh: 0, costUnit: "n/a", seoKeyword: "conflit copropriete indivise", commercialIntent: "medium", bestSeason: "Toute l'année", contractorCategory: "inspecteur_batiment" },
    ],
    contractorBoosts: ["inspecteur_batiment", "entrepreneur_general"],
    contentVariations: {
      introTemplates: [
        "La copropriété indivise est une formule abordable mais juridiquement complexe. Sans syndicat formel, chaque décision de travaux nécessite l'accord de tous les copropriétaires.",
      ],
      whyItHappensTemplates: [
        "L'absence de structure formelle rend le financement difficile (peu de banques financent l'indivise) et les travaux nécessitent un consensus entre copropriétaires.",
      ],
      seasonalTips: ["Établissez une convention d'indivision claire avant d'entreprendre des travaux majeurs."],
      ctaVariations: ["Trouvez un inspecteur qui comprend les enjeux de la copropriété indivise."],
    },
  },

  // ── MULTI FAMILY ───────────────────────────────────────────────────
  {
    slug: "duplex",
    family: "multi_family",
    nameFr: "Duplex",
    nameEn: "Duplex",
    urlSlug: "duplex",
    aliases: ["2 logements"],
    shortDescriptionFr: "Immeuble de 2 logements. Premier pas vers l'investissement locatif au Québec.",
    popularityScore: 70,
    commercialScore: 80,
    seoPriorityScore: 72,
    isMultiUnit: true,
    requiresRegulatoryAttention: false,
    topProblems: [
      { slug: "toiture-duplex", nameFr: "Toiture", urgencyScore: 8, costLow: 6000, costHigh: 18000, costUnit: "projet", seoKeyword: "toiture duplex", commercialIntent: "high", bestSeason: "Été", contractorCategory: "toiture" },
      { slug: "facade-brique-duplex", nameFr: "Façade en brique", urgencyScore: 7, costLow: 5000, costHigh: 25000, costUnit: "projet", seoKeyword: "facade brique duplex", commercialIntent: "high", bestSeason: "Été", contractorCategory: "maconnerie" },
      { slug: "balcons-escaliers", nameFr: "Balcons et escaliers extérieurs", urgencyScore: 8, costLow: 3000, costHigh: 15000, costUnit: "projet", seoKeyword: "balcon escalier duplex", commercialIntent: "high", bestSeason: "Été", contractorCategory: "entrepreneur_general" },
      { slug: "plomberie-colonnes", nameFr: "Colonnes de plomberie", urgencyScore: 7, costLow: 5000, costHigh: 20000, costUnit: "projet", seoKeyword: "plomberie duplex", commercialIntent: "high", bestSeason: "Toute l'année", contractorCategory: "plomberie" },
      { slug: "entretien-locatif", nameFr: "Entretien locatif", urgencyScore: 4, costLow: 500, costHigh: 5000, costUnit: "par an", seoKeyword: "entretien locatif duplex", commercialIntent: "medium", bestSeason: "Toute l'année", contractorCategory: "renovation" },
    ],
    contractorBoosts: ["toiture", "maconnerie", "entrepreneur_general", "plomberie"],
    contentVariations: {
      introTemplates: [
        "Le duplex est l'investissement locatif le plus accessible au Québec. Mais il nécessite un entretien régulier du bâtiment pour protéger sa valeur.",
      ],
      whyItHappensTemplates: [
        "Les duplex montréalais ont souvent des façades en brique, des escaliers extérieurs en fer forgé et des toitures plates qui nécessitent un entretien régulier.",
      ],
      seasonalTips: [
        "Inspectez les balcons et escaliers extérieurs au printemps pour la corrosion.",
        "Planifiez les travaux de toiture plate idéalement entre mai et septembre.",
      ],
      ctaVariations: ["Trouvez un entrepreneur habitué aux immeubles à revenus."],
    },
  },
  {
    slug: "triplex",
    family: "multi_family",
    nameFr: "Triplex",
    nameEn: "Triplex",
    urlSlug: "triplex",
    aliases: ["3 logements"],
    shortDescriptionFr: "Immeuble de 3 logements. Investissement locatif populaire avec des besoins d'entretien de multilogement.",
    popularityScore: 65,
    commercialScore: 82,
    seoPriorityScore: 70,
    isMultiUnit: true,
    requiresRegulatoryAttention: false,
    topProblems: [
      { slug: "toiture-triplex", nameFr: "Toiture multilogement", urgencyScore: 8, costLow: 8000, costHigh: 22000, costUnit: "projet", seoKeyword: "toiture triplex", commercialIntent: "high", bestSeason: "Été", contractorCategory: "toiture" },
      { slug: "facade-triplex", nameFr: "Façade et maçonnerie", urgencyScore: 7, costLow: 8000, costHigh: 35000, costUnit: "projet", seoKeyword: "facade maconnerie triplex", commercialIntent: "high", bestSeason: "Été", contractorCategory: "maconnerie" },
      { slug: "humidite-logements", nameFr: "Humidité dans les logements", urgencyScore: 7, costLow: 2000, costHigh: 10000, costUnit: "logement", seoKeyword: "humidite triplex", commercialIntent: "high", bestSeason: "Printemps", contractorCategory: "fondation" },
      { slug: "escaliers-exterieurs", nameFr: "Escaliers extérieurs", urgencyScore: 8, costLow: 5000, costHigh: 20000, costUnit: "projet", seoKeyword: "escalier exterieur triplex", commercialIntent: "high", bestSeason: "Été", contractorCategory: "entrepreneur_general" },
    ],
    contractorBoosts: ["toiture", "maconnerie", "entrepreneur_general", "plomberie", "fondation"],
    contentVariations: {
      introTemplates: ["Le triplex québécois, avec ses trois logements et ses escaliers extérieurs caractéristiques, nécessite un programme d'entretien structuré."],
      whyItHappensTemplates: ["Les triplex ont plus de surface exposée aux éléments et des systèmes partagés (plomberie, chauffage) qui multiplient les risques."],
      seasonalTips: ["Planifiez une inspection complète de la façade et des escaliers à chaque 5 ans."],
      ctaVariations: ["Trouvez un entrepreneur spécialisé en multilogements."],
    },
  },
  {
    slug: "plex",
    family: "multi_family",
    nameFr: "Plex",
    nameEn: "Plex (4+ units)",
    urlSlug: "plex",
    aliases: ["quadruplex", "4plex", "5plex", "6plex"],
    shortDescriptionFr: "Immeuble de 4 à 6 logements. Nécessite des entrepreneurs habitués aux projets multilogements.",
    popularityScore: 45,
    commercialScore: 80,
    seoPriorityScore: 65,
    isMultiUnit: true,
    requiresRegulatoryAttention: false,
    topProblems: [
      { slug: "toiture-plex", nameFr: "Toiture multilogement", urgencyScore: 8, costLow: 10000, costHigh: 35000, costUnit: "projet", seoKeyword: "toiture plex", commercialIntent: "high", bestSeason: "Été", contractorCategory: "toiture" },
      { slug: "drain-principal-plex", nameFr: "Drain principal", urgencyScore: 9, costLow: 8000, costHigh: 25000, costUnit: "projet", seoKeyword: "drain principal plex", commercialIntent: "high", bestSeason: "Été", contractorCategory: "plomberie" },
      { slug: "conformite-incendie-plex", nameFr: "Conformité incendie", urgencyScore: 10, costLow: 2000, costHigh: 15000, costUnit: "projet", seoKeyword: "conformite incendie plex", commercialIntent: "high", bestSeason: "Toute l'année", contractorCategory: "entrepreneur_general" },
    ],
    contractorBoosts: ["toiture", "plomberie", "maconnerie", "entrepreneur_general"],
    contentVariations: {
      introTemplates: ["Le plex (4 à 6 logements) est un investissement locatif sérieux qui nécessite des entrepreneurs habitués à gérer des projets multilogements avec locataires en place."],
      whyItHappensTemplates: ["Les systèmes partagés (drain principal, toiture, chauffage central) de ces immeubles nécessitent un entretien plus intensif."],
      seasonalTips: ["Faites inspecter la conformité incendie annuellement pour les immeubles de 4+ logements."],
      ctaVariations: ["Trouvez un entrepreneur certifié pour immeubles multilogements."],
    },
  },
  {
    slug: "immeuble_revenus",
    family: "multi_family",
    nameFr: "Immeuble à revenus",
    nameEn: "Revenue Property (7+ units)",
    urlSlug: "immeuble-a-revenus",
    aliases: ["immeuble locatif", "immeuble à logements", "multilogement 4+"],
    shortDescriptionFr: "Immeuble de 7 logements et plus. Gestion professionnelle requise avec des enjeux de conformité, entretien et rendement.",
    popularityScore: 40,
    commercialScore: 95,
    seoPriorityScore: 88,
    isMultiUnit: true,
    requiresRegulatoryAttention: true,
    topProblems: [
      { slug: "toiture-multilogement", nameFr: "Toiture multilogement", urgencyScore: 9, costLow: 15000, costHigh: 80000, costUnit: "projet", seoKeyword: "toiture immeuble a revenus", commercialIntent: "high", bestSeason: "Été", contractorCategory: "toiture" },
      { slug: "facade-maconnerie-immeuble", nameFr: "Façade et maçonnerie", urgencyScore: 8, costLow: 15000, costHigh: 100000, costUnit: "projet", seoKeyword: "facade maconnerie immeuble revenus", commercialIntent: "high", bestSeason: "Été", contractorCategory: "maconnerie" },
      { slug: "colonnes-plomberie", nameFr: "Colonnes de plomberie", urgencyScore: 8, costLow: 10000, costHigh: 50000, costUnit: "projet", seoKeyword: "plomberie immeuble revenus", commercialIntent: "high", bestSeason: "Toute l'année", contractorCategory: "plomberie" },
      { slug: "drain-principal-immeuble", nameFr: "Drain principal", urgencyScore: 9, costLow: 10000, costHigh: 30000, costUnit: "projet", seoKeyword: "drain principal immeuble", commercialIntent: "high", bestSeason: "Été", contractorCategory: "plomberie" },
      { slug: "conformite-incendie-immeuble", nameFr: "Conformité incendie", urgencyScore: 10, costLow: 5000, costHigh: 50000, costUnit: "projet", seoKeyword: "conformite incendie immeuble revenus", commercialIntent: "high", bestSeason: "Toute l'année", contractorCategory: "entrepreneur_general" },
      { slug: "entretien-locatif-immeuble", nameFr: "Entretien locatif intensif", urgencyScore: 5, costLow: 2000, costHigh: 15000, costUnit: "par an", seoKeyword: "entretien locatif immeuble", commercialIntent: "medium", bestSeason: "Toute l'année", contractorCategory: "renovation" },
    ],
    contractorBoosts: ["entrepreneur_general", "toiture", "plomberie", "maconnerie", "fondation", "inspecteur_batiment"],
    contentVariations: {
      introTemplates: [
        "L'immeuble à revenus est un investissement majeur qui nécessite une gestion professionnelle. Chaque problème non résolu affecte directement le rendement et la valeur de l'actif.",
        "Propriétaire d'un immeuble à revenus ? Les enjeux de conformité, d'entretien et de gestion locative sont au cœur de la rentabilité de votre investissement.",
      ],
      whyItHappensTemplates: [
        "Les immeubles à revenus subissent une usure accélérée : plus de locataires, plus de systèmes partagés, plus de surfaces exposées. L'entretien préventif est la clé du rendement.",
        "La conformité incendie et les normes de sécurité deviennent de plus en plus strictes pour les immeubles multilogements, nécessitant des mises à jour régulières.",
      ],
      seasonalTips: [
        "Planifiez les travaux majeurs (toiture, façade) pendant les mois d'été pour minimiser l'impact sur les locataires.",
        "Faites une inspection annuelle complète incluant la toiture, la façade, la plomberie et la conformité incendie.",
      ],
      ctaVariations: [
        "Trouvez un entrepreneur certifié pour immeubles à revenus.",
        "Planifiez votre programme d'entretien préventif avec un professionnel.",
      ],
    },
  },
];

// ─── Lookup Utilities ────────────────────────────────────────────────

export function getPropertyTypeBySlug(slug: string): SeoPropertyType | undefined {
  return SEO_PROPERTY_TYPES.find((t) => t.slug === slug || t.urlSlug === slug);
}

export function getPropertyTypeByUrlSlug(urlSlug: string): SeoPropertyType | undefined {
  return SEO_PROPERTY_TYPES.find((t) => t.urlSlug === urlSlug);
}

export function getPropertyTypesByFamily(family: PropertyFamily): SeoPropertyType[] {
  return SEO_PROPERTY_TYPES.filter((t) => t.family === family);
}

export function getHighPriorityTypes(minScore = 60): SeoPropertyType[] {
  return SEO_PROPERTY_TYPES
    .filter((t) => t.seoPriorityScore >= minScore)
    .sort((a, b) => b.seoPriorityScore - a.seoPriorityScore);
}
