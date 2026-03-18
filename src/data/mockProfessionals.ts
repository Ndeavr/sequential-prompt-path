export interface MockProfessional {
  id: string;
  name: string;
  category: string;
  city: string;
  description: string;
  rating: number;
  badges: string[];
}

export const PROFESSIONAL_CATEGORIES = [
  { name: "Entrepreneurs", slug: "entrepreneurs", icon: "Hammer", count: 245 },
  { name: "Notaires", slug: "notaires", icon: "Scale", count: 32 },
  { name: "Courtiers immobiliers", slug: "courtiers", icon: "Building2", count: 67 },
  { name: "Inspecteurs", slug: "inspecteurs", icon: "Search", count: 41 },
  { name: "Évaluateurs", slug: "evaluateurs", icon: "BarChart3", count: 18 },
  { name: "Assureurs", slug: "assureurs", icon: "Shield", count: 24 },
  { name: "Arpenteurs", slug: "arpenteurs", icon: "Map", count: 12 },
  { name: "Avocats", slug: "avocats", icon: "Gavel", count: 15 },
  { name: "Autres spécialistes", slug: "autres", icon: "Users", count: 28 },
];

export const MOCK_PROFESSIONALS: MockProfessional[] = [
  { id: "p1", name: "Me Julie Tremblay", category: "Notaires", city: "Laval", description: "Notaire spécialisée en droit immobilier et copropriété.", rating: 4.9, badges: ["Vérifié"] },
  { id: "p2", name: "Martin Gagnon, courtier", category: "Courtiers immobiliers", city: "Montréal", description: "Courtier résidentiel avec 15 ans d'expérience dans le Grand Montréal.", rating: 4.7, badges: ["Vérifié", "Très demandé"] },
  { id: "p3", name: "Inspections Qualité+", category: "Inspecteurs", city: "Longueuil", description: "Inspection préachat complète avec rapport thermographique.", rating: 4.8, badges: ["Vérifié", "Diagnostic disponible"] },
  { id: "p4", name: "Évaluation Desjardins & Ass.", category: "Évaluateurs", city: "Québec", description: "Évaluation agréée pour fins de financement et succession.", rating: 4.6, badges: ["Vérifié"] },
  { id: "p5", name: "Assurances Habitation Directe", category: "Assureurs", city: "Laval", description: "Soumissions d'assurance habitation personnalisées.", rating: 4.4, badges: ["Réponse rapide"] },
  { id: "p6", name: "Arpentage Géo-Expert", category: "Arpenteurs", city: "Terrebonne", description: "Certificat de localisation et bornage résidentiel.", rating: 4.7, badges: ["Vérifié"] },
  { id: "p7", name: "Me Philippe Roy", category: "Avocats", city: "Montréal", description: "Avocat en litige construction et vices cachés.", rating: 4.8, badges: ["Vérifié"] },
  { id: "p8", name: "Isolation BioVert", category: "Entrepreneurs", city: "Blainville", description: "Isolation écologique à la cellulose et chanvre.", rating: 4.9, badges: ["Vérifié", "Très demandé"] },
  { id: "p9", name: "Plomberie Express Rive-Sud", category: "Entrepreneurs", city: "Brossard", description: "Service de plomberie rapide pour urgences et rénovations.", rating: 4.5, badges: ["Vérifié", "Urgence 24/7"] },
];
