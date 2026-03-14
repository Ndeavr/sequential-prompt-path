/**
 * UNPRO — SEO Renovation Project Types
 * 200+ renovation project types for programmatic SEO pages.
 * Combined with 50+ cities = 10,000+ unique renovation pages.
 */

export interface SeoRenovation {
  slug: string;
  name: string;
  nameFr: string;
  category: RenovationCategory;
  shortDescription: string;
  designTips: string[];
  budgetTiers: {
    cosmetic: { low: number; high: number };
    balanced: { low: number; high: number };
    premium: { low: number; high: number };
  };
  faqs: { question: string; answer: string }[];
  styleVariations: string[];
  relatedRenovations: string[];
  relatedServices: string[];
  contractorTypes: string[];
  keywords: string[];
}

export type RenovationCategory =
  | "kitchen"
  | "bathroom"
  | "basement"
  | "living-room"
  | "bedroom"
  | "facade"
  | "roof"
  | "paint"
  | "backyard"
  | "pool"
  | "deck"
  | "landscaping"
  | "garage"
  | "entrance"
  | "laundry"
  | "office"
  | "balcony"
  | "windows"
  | "flooring"
  | "lighting";

export const RENOVATION_CATEGORIES: { slug: RenovationCategory; labelFr: string; labelEn: string }[] = [
  { slug: "kitchen", labelFr: "Cuisine", labelEn: "Kitchen" },
  { slug: "bathroom", labelFr: "Salle de bain", labelEn: "Bathroom" },
  { slug: "basement", labelFr: "Sous-sol", labelEn: "Basement" },
  { slug: "living-room", labelFr: "Salon", labelEn: "Living Room" },
  { slug: "bedroom", labelFr: "Chambre", labelEn: "Bedroom" },
  { slug: "facade", labelFr: "Façade", labelEn: "Facade" },
  { slug: "roof", labelFr: "Toiture", labelEn: "Roof" },
  { slug: "paint", labelFr: "Peinture", labelEn: "Paint" },
  { slug: "backyard", labelFr: "Cour arrière", labelEn: "Backyard" },
  { slug: "pool", labelFr: "Piscine", labelEn: "Pool" },
  { slug: "deck", labelFr: "Terrasse", labelEn: "Deck" },
  { slug: "landscaping", labelFr: "Aménagement paysager", labelEn: "Landscaping" },
  { slug: "garage", labelFr: "Garage", labelEn: "Garage" },
  { slug: "entrance", labelFr: "Entrée", labelEn: "Entrance" },
  { slug: "laundry", labelFr: "Buanderie", labelEn: "Laundry" },
  { slug: "office", labelFr: "Bureau", labelEn: "Home Office" },
  { slug: "balcony", labelFr: "Balcon", labelEn: "Balcony" },
  { slug: "windows", labelFr: "Fenêtres", labelEn: "Windows" },
  { slug: "flooring", labelFr: "Plancher", labelEn: "Flooring" },
  { slug: "lighting", labelFr: "Éclairage", labelEn: "Lighting" },
];

export const SEO_RENOVATIONS: SeoRenovation[] = [
  // ─── KITCHEN ───
  {
    slug: "renovation-cuisine-moderne",
    name: "Modern Kitchen Renovation",
    nameFr: "Rénovation cuisine moderne",
    category: "kitchen",
    shortDescription: "Transformez votre cuisine en espace moderne et fonctionnel avec des lignes épurées, des matériaux contemporains et un agencement optimisé.",
    designTips: [
      "Optez pour des armoires à poignées intégrées pour un look minimaliste",
      "Privilégiez un comptoir en quartz pour sa durabilité et son entretien facile",
      "Ajoutez un éclairage sous les armoires pour un effet chaleureux",
      "Considérez un îlot central pour maximiser l'espace de travail",
    ],
    budgetTiers: {
      cosmetic: { low: 5000, high: 15000 },
      balanced: { low: 15000, high: 40000 },
      premium: { low: 40000, high: 80000 },
    },
    faqs: [
      { question: "Combien coûte une rénovation de cuisine moderne ?", answer: "Le coût varie de 5 000 $ pour un rafraîchissement cosmétique à plus de 60 000 $ pour une transformation complète avec armoires sur mesure, comptoirs en quartz et électroménagers haut de gamme." },
      { question: "Combien de temps dure une rénovation de cuisine ?", answer: "Une rénovation cosmétique prend 1 à 2 semaines. Une rénovation complète avec plomberie et électricité nécessite 4 à 8 semaines." },
      { question: "Faut-il un permis pour rénover sa cuisine ?", answer: "Un permis est généralement requis pour les travaux de plomberie et d'électricité. Vérifiez auprès de votre municipalité." },
    ],
    styleVariations: ["moderne", "contemporain", "scandinave", "industriel", "minimaliste"],
    relatedRenovations: ["renovation-cuisine-classique", "renovation-salle-de-bain-moderne", "renovation-plancher-bois"],
    relatedServices: ["renovation-cuisine", "plomberie", "electricite"],
    contractorTypes: ["renovation", "plombier", "electricien"],
    keywords: ["cuisine moderne", "rénovation cuisine", "idées cuisine", "armoires modernes"],
  },
  {
    slug: "renovation-cuisine-classique",
    name: "Classic Kitchen Renovation",
    nameFr: "Rénovation cuisine classique",
    category: "kitchen",
    shortDescription: "Créez une cuisine classique et intemporelle avec des armoires en bois, des comptoirs en granit et des finitions élégantes.",
    designTips: [
      "Choisissez des armoires en bois massif avec moulures décoratives",
      "Installez un dosseret en céramique avec motifs classiques",
      "Ajoutez des poignées en laiton ou en bronze pour un look authentique",
      "Intégrez un éclairage encastré avec variateurs d'intensité",
    ],
    budgetTiers: {
      cosmetic: { low: 8000, high: 18000 },
      balanced: { low: 18000, high: 45000 },
      premium: { low: 45000, high: 90000 },
    },
    faqs: [
      { question: "Quel style de cuisine augmente le plus la valeur de revente ?", answer: "Les cuisines classiques et transitionnelles conservent généralement le mieux leur valeur, car elles plaisent à un plus large éventail d'acheteurs." },
      { question: "Peut-on garder la même disposition de cuisine ?", answer: "Oui, une rénovation cosmétique ou équilibrée peut conserver le plan existant tout en transformant l'apparence avec de nouvelles armoires, comptoirs et accessoires." },
    ],
    styleVariations: ["classique", "traditionnel", "transitionnel", "champêtre"],
    relatedRenovations: ["renovation-cuisine-moderne", "renovation-cuisine-fermier"],
    relatedServices: ["renovation-cuisine", "plomberie"],
    contractorTypes: ["renovation", "ébéniste"],
    keywords: ["cuisine classique", "armoires bois", "cuisine traditionnelle"],
  },
  {
    slug: "renovation-cuisine-fermier",
    name: "Farmhouse Kitchen Renovation",
    nameFr: "Rénovation cuisine fermier",
    category: "kitchen",
    shortDescription: "Adoptez le charme rustique avec une cuisine style fermier : armoires shaker, évier farmhouse et matériaux naturels.",
    designTips: [
      "Installez un évier farmhouse en porcelaine ou en acier inoxydable",
      "Utilisez des armoires shaker blanches ou crème",
      "Ajoutez des tablettes ouvertes pour un look aéré",
      "Choisissez un comptoir en bois boucher pour l'îlot",
    ],
    budgetTiers: {
      cosmetic: { low: 6000, high: 16000 },
      balanced: { low: 16000, high: 38000 },
      premium: { low: 38000, high: 75000 },
    },
    faqs: [
      { question: "Le style fermier est-il encore tendance ?", answer: "Oui, le style farmhouse moderne reste très populaire car il combine chaleur, confort et fonctionnalité." },
    ],
    styleVariations: ["farmhouse", "rustique", "campagne moderne"],
    relatedRenovations: ["renovation-cuisine-classique", "renovation-cuisine-moderne"],
    relatedServices: ["renovation-cuisine", "plomberie"],
    contractorTypes: ["renovation", "ébéniste"],
    keywords: ["cuisine fermier", "farmhouse kitchen", "cuisine rustique"],
  },
  // ─── BATHROOM ───
  {
    slug: "renovation-salle-de-bain-moderne",
    name: "Modern Bathroom Renovation",
    nameFr: "Rénovation salle de bain moderne",
    category: "bathroom",
    shortDescription: "Transformez votre salle de bain en oasis moderne avec douche à l'italienne, vanité flottante et carrelage grand format.",
    designTips: [
      "Installez une douche à l'italienne sans seuil pour un look spacieux",
      "Choisissez une vanité flottante pour dégager le plancher",
      "Utilisez du carrelage grand format pour minimiser les joints",
      "Ajoutez un miroir rétroéclairé pour un éclairage ambiant",
    ],
    budgetTiers: {
      cosmetic: { low: 4000, high: 12000 },
      balanced: { low: 12000, high: 25000 },
      premium: { low: 25000, high: 50000 },
    },
    faqs: [
      { question: "Combien coûte une douche à l'italienne ?", answer: "L'installation d'une douche à l'italienne coûte entre 5 000 $ et 15 000 $ selon les matériaux et la complexité de l'installation." },
      { question: "Est-ce qu'une rénovation de salle de bain augmente la valeur ?", answer: "Oui, une salle de bain rénovée peut augmenter la valeur de votre maison de 5 à 10 %." },
    ],
    styleVariations: ["moderne", "spa", "minimaliste", "luxe"],
    relatedRenovations: ["renovation-salle-de-bain-classique", "renovation-cuisine-moderne"],
    relatedServices: ["renovation-salle-de-bain", "plomberie"],
    contractorTypes: ["renovation", "plombier", "carreleur"],
    keywords: ["salle de bain moderne", "douche italienne", "vanité flottante"],
  },
  {
    slug: "renovation-salle-de-bain-classique",
    name: "Classic Bathroom Renovation",
    nameFr: "Rénovation salle de bain classique",
    category: "bathroom",
    shortDescription: "Créez une salle de bain élégante et intemporelle avec baignoire autoportante, carrelage en marbre et finitions chromées.",
    designTips: [
      "Installez une baignoire autoportante comme pièce maîtresse",
      "Utilisez du carrelage effet marbre pour un look luxueux",
      "Choisissez de la robinetterie chromée ou en nickel brossé",
      "Ajoutez des moulures et panneaux muraux pour un look classique",
    ],
    budgetTiers: {
      cosmetic: { low: 5000, high: 14000 },
      balanced: { low: 14000, high: 30000 },
      premium: { low: 30000, high: 60000 },
    },
    faqs: [
      { question: "Baignoire autoportante ou encastrée ?", answer: "La baignoire autoportante est un élément signature qui ajoute du cachet, mais nécessite plus d'espace. L'encastrée est plus pratique pour les petites salles de bain." },
    ],
    styleVariations: ["classique", "art déco", "victorien"],
    relatedRenovations: ["renovation-salle-de-bain-moderne", "renovation-plancher-ceramique"],
    relatedServices: ["renovation-salle-de-bain", "plomberie"],
    contractorTypes: ["renovation", "plombier"],
    keywords: ["salle de bain classique", "baignoire autoportante", "rénovation salle de bain"],
  },
  // ─── BASEMENT ───
  {
    slug: "amenagement-sous-sol",
    name: "Basement Finishing",
    nameFr: "Aménagement de sous-sol",
    category: "basement",
    shortDescription: "Transformez votre sous-sol non fini en espace de vie confortable : salle familiale, cinéma maison ou chambre d'amis.",
    designTips: [
      "Assurez une bonne isolation et pare-vapeur avant les finitions",
      "Installez un plancher résistant à l'humidité (vinyle, céramique)",
      "Prévoyez un éclairage abondant pour compenser le manque de lumière naturelle",
      "Considérez un système de chauffage indépendant pour le confort",
    ],
    budgetTiers: {
      cosmetic: { low: 10000, high: 20000 },
      balanced: { low: 20000, high: 45000 },
      premium: { low: 45000, high: 80000 },
    },
    faqs: [
      { question: "Faut-il un permis pour finir un sous-sol ?", answer: "Oui, un permis de construction est généralement requis pour l'aménagement d'un sous-sol, surtout pour les travaux électriques et de plomberie." },
      { question: "Comment gérer l'humidité au sous-sol ?", answer: "Assurez-vous que le drain français fonctionne, installez un déshumidificateur et utilisez un pare-vapeur adéquat avant les finitions." },
    ],
    styleVariations: ["moderne", "cinéma maison", "salle de jeux", "studio"],
    relatedRenovations: ["renovation-plancher-vinyle", "renovation-eclairage"],
    relatedServices: ["electricite", "plomberie", "isolation-entretoit"],
    contractorTypes: ["renovation", "electricien", "plombier"],
    keywords: ["finition sous-sol", "aménagement sous-sol", "sous-sol fini"],
  },
  // ─── FACADE ───
  {
    slug: "renovation-facade-moderne",
    name: "Modern Facade Renovation",
    nameFr: "Rénovation façade moderne",
    category: "facade",
    shortDescription: "Modernisez l'apparence extérieure de votre maison avec des matériaux contemporains, des lignes épurées et un design audacieux.",
    designTips: [
      "Combinez différents matériaux (bois, métal, pierre) pour créer du contraste",
      "Ajoutez des éléments architecturaux modernes comme un porche surdimensionné",
      "Coordonnez les couleurs de la façade avec la toiture et les fenêtres",
      "Intégrez un éclairage extérieur architectural pour mettre en valeur la façade",
    ],
    budgetTiers: {
      cosmetic: { low: 5000, high: 15000 },
      balanced: { low: 15000, high: 40000 },
      premium: { low: 40000, high: 80000 },
    },
    faqs: [
      { question: "Quel revêtement extérieur est le plus durable ?", answer: "Le fibrociment et la maçonnerie sont les plus durables (50+ ans), suivis du vinyle premium (30+ ans) et du bois traité (20+ ans avec entretien)." },
      { question: "Est-ce qu'une rénovation de façade augmente la valeur ?", answer: "Oui, l'attrait extérieur (curb appeal) peut augmenter la valeur de votre propriété de 5 à 15 %." },
    ],
    styleVariations: ["moderne", "contemporain", "industriel", "scandinave"],
    relatedRenovations: ["renovation-facade-classique", "remplacement-fenetres"],
    relatedServices: ["revetement-exterieur", "peinture-exterieure", "fenetre-porte"],
    contractorTypes: ["revetement", "peinture", "maçon"],
    keywords: ["façade moderne", "rénovation extérieure", "curb appeal"],
  },
  {
    slug: "renovation-facade-classique",
    name: "Classic Facade Renovation",
    nameFr: "Rénovation façade classique",
    category: "facade",
    shortDescription: "Restaurez le charme classique de votre maison avec des matériaux traditionnels, des moulures décoratives et des couleurs intemporelles.",
    designTips: [
      "Restaurez ou ajoutez des moulures décoratives et corniches",
      "Utilisez de la brique ou de la pierre naturelle pour l'authenticité",
      "Choisissez des couleurs traditionnelles qui respectent le patrimoine architectural",
      "Remplacez les fenêtres par des modèles qui respectent le style d'origine",
    ],
    budgetTiers: {
      cosmetic: { low: 8000, high: 20000 },
      balanced: { low: 20000, high: 50000 },
      premium: { low: 50000, high: 100000 },
    },
    faqs: [
      { question: "Faut-il respecter des normes patrimoniales ?", answer: "Dans certains quartiers historiques, des règles strictes encadrent les rénovations de façade. Vérifiez auprès de votre municipalité avant de commencer." },
    ],
    styleVariations: ["classique", "victorien", "patrimonial", "colonial"],
    relatedRenovations: ["renovation-facade-moderne", "renovation-toiture"],
    relatedServices: ["revetement-exterieur", "peinture-exterieure"],
    contractorTypes: ["maçon", "revetement", "peinture"],
    keywords: ["façade classique", "restauration façade", "rénovation extérieure classique"],
  },
  // ─── BACKYARD ───
  {
    slug: "amenagement-cour-arriere",
    name: "Backyard Design",
    nameFr: "Aménagement cour arrière",
    category: "backyard",
    shortDescription: "Transformez votre cour arrière en espace de vie extérieur avec terrasse, pergola, aménagement paysager et coin détente.",
    designTips: [
      "Définissez des zones distinctes : repas, détente, jeux",
      "Ajoutez une pergola ou un gazebo pour de l'ombre",
      "Intégrez un éclairage extérieur pour les soirées",
      "Choisissez des plantes adaptées au climat québécois",
    ],
    budgetTiers: {
      cosmetic: { low: 3000, high: 10000 },
      balanced: { low: 10000, high: 30000 },
      premium: { low: 30000, high: 80000 },
    },
    faqs: [
      { question: "Faut-il un permis pour aménager sa cour ?", answer: "Un permis peut être requis pour les structures (pergola, piscine, clôture) selon votre municipalité. Vérifiez les règlements locaux." },
      { question: "Quel est le meilleur moment pour aménager sa cour ?", answer: "Le printemps (avril-mai) est idéal pour la plantation. Les travaux de construction peuvent se faire de mai à octobre." },
    ],
    styleVariations: ["moderne", "champêtre", "zen", "méditerranéen"],
    relatedRenovations: ["installation-piscine", "construction-terrasse", "amenagement-paysager"],
    relatedServices: ["amenagement-paysager", "cloture"],
    contractorTypes: ["paysagiste", "menuisier"],
    keywords: ["cour arrière", "aménagement extérieur", "terrasse", "pergola"],
  },
  // ─── POOL ───
  {
    slug: "installation-piscine",
    name: "Pool Installation",
    nameFr: "Installation de piscine",
    category: "pool",
    shortDescription: "Ajoutez une piscine creusée ou semi-creusée à votre propriété pour créer un espace de détente et augmenter la valeur de votre maison.",
    designTips: [
      "Choisissez une forme de piscine adaptée à la taille de votre terrain",
      "Prévoyez un aménagement paysager autour de la piscine",
      "Considérez un système de chauffage pour prolonger la saison",
      "Intégrez un éclairage subaquatique pour les soirées",
    ],
    budgetTiers: {
      cosmetic: { low: 15000, high: 25000 },
      balanced: { low: 25000, high: 50000 },
      premium: { low: 50000, high: 120000 },
    },
    faqs: [
      { question: "Est-ce qu'une piscine augmente la valeur de la propriété ?", answer: "Une piscine bien entretenue peut augmenter la valeur de 5 à 10 %, mais cela dépend du marché local et du type de piscine." },
      { question: "Quel type de piscine choisir au Québec ?", answer: "Les piscines creusées en béton ou en fibre de verre sont les plus populaires. Les semi-creusées offrent un bon compromis qualité-prix." },
    ],
    styleVariations: ["moderne", "naturel", "infinity", "lap pool"],
    relatedRenovations: ["amenagement-cour-arriere", "construction-terrasse"],
    relatedServices: ["amenagement-paysager"],
    contractorTypes: ["piscine", "paysagiste"],
    keywords: ["piscine creusée", "installation piscine", "piscine Québec"],
  },
  // ─── DECK ───
  {
    slug: "construction-terrasse",
    name: "Deck Construction",
    nameFr: "Construction de terrasse",
    category: "deck",
    shortDescription: "Construisez une terrasse en bois ou en composite pour agrandir votre espace de vie extérieur et profiter de l'été québécois.",
    designTips: [
      "Le composite nécessite moins d'entretien que le bois naturel",
      "Prévoyez un éclairage intégré dans les marches et les rampes",
      "Ajoutez un coin cuisine extérieure ou BBQ",
      "Considérez un toit rétractable ou une pergola pour plus de polyvalence",
    ],
    budgetTiers: {
      cosmetic: { low: 3000, high: 8000 },
      balanced: { low: 8000, high: 20000 },
      premium: { low: 20000, high: 50000 },
    },
    faqs: [
      { question: "Bois ou composite pour une terrasse ?", answer: "Le composite coûte plus cher à l'achat mais dure plus longtemps sans entretien. Le cèdre est plus abordable mais nécessite un traitement annuel." },
      { question: "Faut-il un permis pour construire une terrasse ?", answer: "Oui, dans la plupart des municipalités québécoises, un permis est requis pour toute terrasse surélevée de plus de 60 cm." },
    ],
    styleVariations: ["moderne", "rustique", "multi-niveaux", "enveloppant"],
    relatedRenovations: ["amenagement-cour-arriere", "installation-piscine"],
    relatedServices: ["amenagement-paysager", "cloture"],
    contractorTypes: ["menuisier", "renovation"],
    keywords: ["terrasse bois", "deck composite", "construction terrasse"],
  },
  // ─── ROOF ───
  {
    slug: "renovation-toiture",
    name: "Roof Renovation",
    nameFr: "Rénovation de toiture",
    category: "roof",
    shortDescription: "Remplacez ou rénovez votre toiture pour protéger votre maison et lui donner un nouveau look avec des bardeaux modernes ou une toiture métallique.",
    designTips: [
      "Les bardeaux architecturaux ajoutent de la dimension à votre toiture",
      "La toiture métallique offre 50+ ans de durabilité",
      "Coordonnez la couleur de la toiture avec la façade",
      "Profitez du remplacement pour améliorer l'isolation et la ventilation",
    ],
    budgetTiers: {
      cosmetic: { low: 5000, high: 12000 },
      balanced: { low: 12000, high: 25000 },
      premium: { low: 25000, high: 50000 },
    },
    faqs: [
      { question: "Quelle est la durée de vie d'une toiture ?", answer: "Les bardeaux d'asphalte durent 20 à 30 ans, les toitures métalliques 40 à 60 ans, et l'ardoise 75+ ans." },
      { question: "Quel est le meilleur moment pour refaire sa toiture ?", answer: "L'été et le début de l'automne (juin à octobre) sont idéaux pour les travaux de toiture au Québec." },
    ],
    styleVariations: ["bardeaux architecturaux", "toiture métallique", "ardoise"],
    relatedRenovations: ["renovation-facade-moderne", "renovation-facade-classique"],
    relatedServices: ["couvreur", "isolation-entretoit", "gouttiere"],
    contractorTypes: ["couvreur"],
    keywords: ["toiture", "bardeaux", "réfection toiture", "couvreur"],
  },
  // ─── LIVING ROOM ───
  {
    slug: "renovation-salon-moderne",
    name: "Modern Living Room Renovation",
    nameFr: "Rénovation salon moderne",
    category: "living-room",
    shortDescription: "Transformez votre salon en espace ouvert et lumineux avec des matériaux contemporains, un foyer moderne et un éclairage d'ambiance.",
    designTips: [
      "Ouvrez le plan vers la cuisine pour un espace de vie continu",
      "Installez un foyer linéaire pour un point focal moderne",
      "Utilisez des matériaux nobles (bois, pierre) pour ajouter de la texture",
      "Maximisez la lumière naturelle avec de grandes fenêtres",
    ],
    budgetTiers: {
      cosmetic: { low: 3000, high: 10000 },
      balanced: { low: 10000, high: 25000 },
      premium: { low: 25000, high: 60000 },
    },
    faqs: [
      { question: "Combien coûte l'ouverture d'un mur porteur ?", answer: "L'ouverture d'un mur porteur coûte entre 3 000 $ et 10 000 $ selon la largeur de l'ouverture et la structure requise." },
    ],
    styleVariations: ["moderne", "contemporain", "minimaliste", "scandinave"],
    relatedRenovations: ["renovation-cuisine-moderne", "renovation-plancher-bois"],
    relatedServices: ["renovation-cuisine", "electricite"],
    contractorTypes: ["renovation", "electricien"],
    keywords: ["salon moderne", "rénovation salon", "espace ouvert", "foyer moderne"],
  },
  // ─── FLOORING ───
  {
    slug: "renovation-plancher-bois",
    name: "Hardwood Floor Renovation",
    nameFr: "Rénovation plancher de bois",
    category: "flooring",
    shortDescription: "Installez ou rénovez vos planchers de bois franc pour un look classique et chaleureux qui traverse les décennies.",
    designTips: [
      "Le chêne blanc est le choix le plus populaire et polyvalent",
      "Les planches larges donnent un look contemporain",
      "Un fini mat est plus moderne et cache mieux les imperfections",
      "Le sablage et le vernissage peuvent redonner vie à des planchers existants",
    ],
    budgetTiers: {
      cosmetic: { low: 2000, high: 5000 },
      balanced: { low: 5000, high: 15000 },
      premium: { low: 15000, high: 30000 },
    },
    faqs: [
      { question: "Peut-on sabler un plancher de bois franc ?", answer: "Oui, un plancher de bois massif peut être sablé 3 à 5 fois au cours de sa vie. Un plancher d'ingénierie ne peut généralement être sablé qu'une ou deux fois." },
    ],
    styleVariations: ["classique", "contemporain", "rustique", "chevron"],
    relatedRenovations: ["renovation-salon-moderne", "renovation-cuisine-moderne"],
    relatedServices: [],
    contractorTypes: ["renovation", "plancher"],
    keywords: ["plancher bois franc", "sablage plancher", "plancher chêne"],
  },
  // ─── PAINT ───
  {
    slug: "peinture-interieure",
    name: "Interior Paint",
    nameFr: "Peinture intérieure",
    category: "paint",
    shortDescription: "Rafraîchissez votre intérieur avec une nouvelle palette de couleurs tendance. La peinture est la rénovation la plus abordable et la plus transformatrice.",
    designTips: [
      "Les tons neutres chauds sont intemporels et agrandissent l'espace",
      "Un mur d'accent ajoute du caractère sans surcharger la pièce",
      "Utilisez de la peinture mate pour les murs et satinée pour les boiseries",
      "Les couleurs foncées créent de la profondeur dans les grandes pièces",
    ],
    budgetTiers: {
      cosmetic: { low: 1500, high: 4000 },
      balanced: { low: 4000, high: 8000 },
      premium: { low: 8000, high: 15000 },
    },
    faqs: [
      { question: "Combien coûte la peinture d'une maison complète ?", answer: "Le coût professionnel pour peindre l'intérieur d'une maison typique (1 200 à 2 000 pi²) varie de 3 000 $ à 8 000 $." },
    ],
    styleVariations: ["neutre chaud", "couleurs tendance", "monochrome", "bicolore"],
    relatedRenovations: ["renovation-salon-moderne", "renovation-chambre"],
    relatedServices: ["peinture-exterieure"],
    contractorTypes: ["peinture"],
    keywords: ["peinture intérieure", "couleurs tendance", "peintre résidentiel"],
  },
  // ─── ENTRANCE ───
  {
    slug: "renovation-entree",
    name: "Entrance Renovation",
    nameFr: "Rénovation d'entrée",
    category: "entrance",
    shortDescription: "Créez une entrée accueillante et fonctionnelle qui donne le ton à votre maison avec des rangements intégrés et un design soigné.",
    designTips: [
      "Ajoutez un banc avec rangement intégré pour les chaussures",
      "Installez des crochets et un vestiaire organisé",
      "Utilisez un éclairage d'accueil chaleureux",
      "Choisissez un revêtement de sol résistant et facile à nettoyer",
    ],
    budgetTiers: {
      cosmetic: { low: 1000, high: 4000 },
      balanced: { low: 4000, high: 10000 },
      premium: { low: 10000, high: 25000 },
    },
    faqs: [
      { question: "Comment maximiser le rangement dans une petite entrée ?", answer: "Utilisez la hauteur avec des étagères, des crochets muraux et un banc avec rangement dissimulé. Un miroir agrandit visuellement l'espace." },
    ],
    styleVariations: ["moderne", "classique", "scandinave", "rustique"],
    relatedRenovations: ["renovation-plancher-bois", "peinture-interieure"],
    relatedServices: [],
    contractorTypes: ["renovation", "menuisier"],
    keywords: ["entrée maison", "vestibule", "rénovation entrée"],
  },
  // ─── BEDROOM ───
  {
    slug: "renovation-chambre",
    name: "Bedroom Renovation",
    nameFr: "Rénovation de chambre",
    category: "bedroom",
    shortDescription: "Transformez votre chambre en sanctuaire de détente avec un design apaisant, des rangements optimisés et un éclairage d'ambiance.",
    designTips: [
      "Créez un mur d'accent derrière la tête de lit",
      "Installez des rideaux du plafond au sol pour un effet dramatique",
      "Ajoutez un éclairage tamisé avec variateurs",
      "Optimisez les rangements avec des garde-robes intégrées",
    ],
    budgetTiers: {
      cosmetic: { low: 2000, high: 6000 },
      balanced: { low: 6000, high: 15000 },
      premium: { low: 15000, high: 35000 },
    },
    faqs: [
      { question: "Comment rendre une petite chambre plus grande ?", answer: "Utilisez des couleurs claires, un miroir, des meubles bas et un éclairage stratégique pour créer l'illusion d'espace." },
    ],
    styleVariations: ["moderne", "zen", "luxe", "scandinave"],
    relatedRenovations: ["renovation-plancher-bois", "peinture-interieure", "renovation-eclairage"],
    relatedServices: ["electricite"],
    contractorTypes: ["renovation", "peinture"],
    keywords: ["chambre rénovation", "design chambre", "chambre moderne"],
  },
  // ─── LANDSCAPING ───
  {
    slug: "amenagement-paysager-complet",
    name: "Complete Landscaping",
    nameFr: "Aménagement paysager complet",
    category: "landscaping",
    shortDescription: "Créez un aménagement paysager complet avec plantations, pavé uni, murets et éclairage pour transformer votre terrain en véritable oasis.",
    designTips: [
      "Planifiez les zones ensoleillées et ombragées pour le choix des plantes",
      "Utilisez du pavé uni pour les allées et le stationnement",
      "Intégrez un système d'irrigation automatique",
      "Choisissez des plantes indigènes résistantes au climat québécois",
    ],
    budgetTiers: {
      cosmetic: { low: 5000, high: 12000 },
      balanced: { low: 12000, high: 35000 },
      premium: { low: 35000, high: 80000 },
    },
    faqs: [
      { question: "Quelles plantes sont les meilleures pour le Québec ?", answer: "Les plantes indigènes comme l'érable rouge, le bouleau, les hostas et les échinacées sont excellentes car elles sont adaptées au climat local." },
    ],
    styleVariations: ["contemporain", "naturel", "japonais", "anglais"],
    relatedRenovations: ["amenagement-cour-arriere", "construction-terrasse"],
    relatedServices: ["amenagement-paysager", "cloture"],
    contractorTypes: ["paysagiste"],
    keywords: ["aménagement paysager", "pavé uni", "jardin Québec"],
  },
  // ─── WINDOWS ───
  {
    slug: "remplacement-fenetres",
    name: "Window Replacement",
    nameFr: "Remplacement de fenêtres",
    category: "windows",
    shortDescription: "Remplacez vos fenêtres pour améliorer l'efficacité énergétique, le confort acoustique et l'esthétique de votre maison.",
    designTips: [
      "Le triple vitrage est recommandé pour le climat québécois",
      "Les fenêtres à battant offrent la meilleure étanchéité",
      "Choisissez des cadres en PVC ou en fibre de verre pour la durabilité",
      "Considérez des fenêtres plus grandes pour maximiser la lumière naturelle",
    ],
    budgetTiers: {
      cosmetic: { low: 3000, high: 8000 },
      balanced: { low: 8000, high: 20000 },
      premium: { low: 20000, high: 45000 },
    },
    faqs: [
      { question: "Combien de fenêtres peut-on remplacer par jour ?", answer: "Un installateur professionnel peut remplacer 4 à 8 fenêtres par jour selon la taille et la complexité." },
      { question: "Y a-t-il des subventions pour le remplacement de fenêtres ?", answer: "Oui, des programmes comme Rénoclimat et la subvention fédérale offrent des remises pour les fenêtres écoénergétiques." },
    ],
    styleVariations: ["battant", "coulissant", "à guillotine", "baie vitrée"],
    relatedRenovations: ["renovation-facade-moderne", "renovation-facade-classique"],
    relatedServices: ["fenetre-porte"],
    contractorTypes: ["fenetre"],
    keywords: ["remplacement fenêtres", "fenêtres écoénergétiques", "triple vitrage"],
  },
  // ─── LIGHTING ───
  {
    slug: "renovation-eclairage",
    name: "Lighting Renovation",
    nameFr: "Rénovation d'éclairage",
    category: "lighting",
    shortDescription: "Repensez l'éclairage de votre maison pour créer des ambiances, mettre en valeur l'architecture et améliorer la fonctionnalité de chaque pièce.",
    designTips: [
      "Combinez éclairage ambiant, fonctionnel et d'accent",
      "Utilisez des variateurs pour adapter l'ambiance",
      "Les encastrés LED offrent un look épuré et écoénergétique",
      "Des suspensions design deviennent des éléments décoratifs",
    ],
    budgetTiers: {
      cosmetic: { low: 1000, high: 3000 },
      balanced: { low: 3000, high: 8000 },
      premium: { low: 8000, high: 20000 },
    },
    faqs: [
      { question: "Combien coûte l'installation d'encastrés LED ?", answer: "L'installation de 8 à 12 encastrés LED coûte entre 800 $ et 2 500 $ incluant les luminaires et la main-d'œuvre d'un électricien." },
    ],
    styleVariations: ["moderne", "industriel", "chaleureux", "architectural"],
    relatedRenovations: ["renovation-cuisine-moderne", "renovation-salon-moderne"],
    relatedServices: ["electricite"],
    contractorTypes: ["electricien"],
    keywords: ["éclairage LED", "encastrés", "rénovation éclairage"],
  },
  // ─── GARAGE ───
  {
    slug: "renovation-garage",
    name: "Garage Renovation",
    nameFr: "Rénovation de garage",
    category: "garage",
    shortDescription: "Transformez votre garage en espace organisé et fonctionnel avec un plancher époxy, des rangements muraux et un éclairage adéquat.",
    designTips: [
      "Un plancher époxy est durable et facile à nettoyer",
      "Installez des systèmes de rangement muraux pour libérer le sol",
      "Ajoutez un éclairage LED pour un espace de travail lumineux",
      "Considérez une isolation pour un confort quatre saisons",
    ],
    budgetTiers: {
      cosmetic: { low: 2000, high: 5000 },
      balanced: { low: 5000, high: 12000 },
      premium: { low: 12000, high: 30000 },
    },
    faqs: [
      { question: "Combien coûte un plancher de garage époxy ?", answer: "Un plancher époxy professionnel coûte entre 1 500 $ et 4 000 $ pour un garage double, selon la préparation et le type d'époxy." },
    ],
    styleVariations: ["atelier", "showroom", "fonctionnel", "multi-usage"],
    relatedRenovations: ["amenagement-sous-sol", "renovation-eclairage"],
    relatedServices: ["electricite"],
    contractorTypes: ["renovation", "plancher"],
    keywords: ["garage époxy", "rénovation garage", "rangement garage"],
  },
];

// ─── Helpers ───

export const getRenovationBySlug = (slug: string): SeoRenovation | undefined =>
  SEO_RENOVATIONS.find((r) => r.slug === slug);

export const getRenovationsByCategory = (cat: RenovationCategory): SeoRenovation[] =>
  SEO_RENOVATIONS.filter((r) => r.category === cat);

export const getRelatedRenovationObjects = (renovation: SeoRenovation): SeoRenovation[] =>
  renovation.relatedRenovations
    .map((s) => getRenovationBySlug(s))
    .filter((r): r is SeoRenovation => !!r);
