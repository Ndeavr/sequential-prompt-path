export interface MockProblemCategory {
  name: string;
  slug: string;
  icon: string;
  description: string;
  issueCount: number;
  items: { title: string; urgency: "low" | "medium" | "high" | "critical" }[];
}

export const MOCK_PROBLEM_CATEGORIES: MockProblemCategory[] = [
  {
    name: "Toiture", slug: "toiture", icon: "Home", description: "Infiltrations, bardeaux usés, toiture plate qui coule.",
    issueCount: 12,
    items: [
      { title: "Infiltration d'eau par le toit", urgency: "critical" },
      { title: "Bardeaux soulevés ou manquants", urgency: "high" },
      { title: "Mousse et accumulation de débris", urgency: "medium" },
      { title: "Glaçons en bordure de toit", urgency: "high" },
      { title: "Toiture plate qui gondole", urgency: "medium" },
    ],
  },
  {
    name: "Isolation", slug: "isolation", icon: "Thermometer", description: "Perte de chaleur, factures élevées, inconfort thermique.",
    issueCount: 9,
    items: [
      { title: "Grenier mal isolé", urgency: "high" },
      { title: "Murs froids en hiver", urgency: "medium" },
      { title: "Courants d'air autour des fenêtres", urgency: "medium" },
      { title: "Facture de chauffage anormalement élevée", urgency: "high" },
      { title: "Condensation excessive", urgency: "medium" },
    ],
  },
  {
    name: "Fondation", slug: "fondation", icon: "Landmark", description: "Fissures, infiltrations, affaissement structural.",
    issueCount: 8,
    items: [
      { title: "Fissures visibles dans la fondation", urgency: "high" },
      { title: "Infiltration d'eau au sous-sol", urgency: "critical" },
      { title: "Efflorescence blanche sur les murs", urgency: "medium" },
      { title: "Plancher qui penche", urgency: "high" },
      { title: "Drain français obstrué", urgency: "high" },
    ],
  },
  {
    name: "Plomberie", slug: "plomberie", icon: "Droplets", description: "Fuites, drains bouchés, chauffe-eau défaillant.",
    issueCount: 11,
    items: [
      { title: "Fuite sous l'évier", urgency: "high" },
      { title: "Chauffe-eau qui ne chauffe plus", urgency: "critical" },
      { title: "Drain lent ou bouché", urgency: "medium" },
      { title: "Bruit dans la tuyauterie", urgency: "low" },
      { title: "Tuyaux gelés en hiver", urgency: "critical" },
    ],
  },
  {
    name: "Électricité", slug: "electricite", icon: "Zap", description: "Panneaux désuets, surcharges, mises aux normes.",
    issueCount: 7,
    items: [
      { title: "Panneau électrique à fusibles", urgency: "high" },
      { title: "Disjoncteur qui saute souvent", urgency: "high" },
      { title: "Prises non mises à la terre", urgency: "medium" },
      { title: "Câblage en aluminium", urgency: "high" },
      { title: "Surcharge électrique", urgency: "critical" },
    ],
  },
  {
    name: "Fenêtres", slug: "fenetres", icon: "Square", description: "Condensation, courants d'air, vitrage brisé.",
    issueCount: 6,
    items: [
      { title: "Condensation entre les vitres", urgency: "medium" },
      { title: "Fenêtres qui ne ferment plus bien", urgency: "medium" },
      { title: "Courants d'air importants", urgency: "high" },
      { title: "Cadre de fenêtre pourri", urgency: "high" },
      { title: "Vitre fissurée ou brisée", urgency: "high" },
    ],
  },
  {
    name: "Chauffage", slug: "chauffage", icon: "Flame", description: "Systèmes inefficaces, thermopompes, conversion.",
    issueCount: 8,
    items: [
      { title: "Chauffage inégal entre les pièces", urgency: "medium" },
      { title: "Thermopompe qui ne refroidit plus", urgency: "high" },
      { title: "Bruit excessif du système de chauffage", urgency: "low" },
      { title: "Fournaise à remplacer", urgency: "high" },
      { title: "Conversion au chauffage central", urgency: "low" },
    ],
  },
  {
    name: "Ventilation", slug: "ventilation", icon: "Wind", description: "Qualité de l'air, échangeur, moisissure.",
    issueCount: 5,
    items: [
      { title: "Échangeur d'air défectueux", urgency: "high" },
      { title: "Humidité excessive dans la maison", urgency: "medium" },
      { title: "Odeurs persistantes", urgency: "medium" },
      { title: "Moisissure dans les conduits", urgency: "critical" },
      { title: "Salle de bain sans ventilation", urgency: "medium" },
    ],
  },
  {
    name: "Humidité et moisissure", slug: "humidite-moisissure", icon: "CloudRain", description: "Moisissure visible, odeurs, dégâts d'eau.",
    issueCount: 7,
    items: [
      { title: "Moisissure visible sur les murs", urgency: "critical" },
      { title: "Odeur de moisi au sous-sol", urgency: "high" },
      { title: "Taches d'eau au plafond", urgency: "high" },
      { title: "Peinture qui pèle par l'humidité", urgency: "medium" },
      { title: "Dégât d'eau récent", urgency: "critical" },
    ],
  },
  {
    name: "Extérieur", slug: "exterieur", icon: "TreePine", description: "Revêtement, balcon, entrée, paysagement.",
    issueCount: 6,
    items: [
      { title: "Revêtement extérieur endommagé", urgency: "medium" },
      { title: "Balcon ou galerie qui pourrit", urgency: "high" },
      { title: "Entrée d'eau par la porte", urgency: "high" },
      { title: "Asphalte de l'entrée fissurée", urgency: "low" },
      { title: "Gouttières bouchées", urgency: "medium" },
    ],
  },
];
