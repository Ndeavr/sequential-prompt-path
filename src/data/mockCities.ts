export interface MockCity {
  name: string;
  slug: string;
  region: string;
  professionalCount: number;
  serviceCategoryCount: number;
  featuredProblems: string[];
  intro: string;
}

export const MOCK_CITIES: MockCity[] = [
  { name: "Montréal", slug: "montreal", region: "Grand Montréal", professionalCount: 245, serviceCategoryCount: 18, featuredProblems: ["Fondation", "Toiture plate", "Plomberie vétuste"], intro: "La métropole du Québec regorge de propriétés centenaires et de condos modernes, chacun avec ses défis uniques." },
  { name: "Laval", slug: "laval", region: "Laval", professionalCount: 87, serviceCategoryCount: 15, featuredProblems: ["Isolation", "Drain français", "Thermopompe"], intro: "Ville en pleine croissance avec un parc immobilier diversifié allant du bungalow des années 70 aux constructions récentes." },
  { name: "Longueuil", slug: "longueuil", region: "Montérégie", professionalCount: 62, serviceCategoryCount: 14, featuredProblems: ["Toiture bardeaux", "Fenêtres", "Humidité sous-sol"], intro: "Rive-Sud dynamique combinant quartiers résidentiels matures et développements neufs." },
  { name: "Terrebonne", slug: "terrebonne", region: "Lanaudière", professionalCount: 45, serviceCategoryCount: 12, featuredProblems: ["Isolation grenier", "Fondation", "Ventilation"], intro: "Croissance résidentielle rapide avec beaucoup de maisons des années 80-90 nécessitant des mises à jour." },
  { name: "Repentigny", slug: "repentigny", region: "Lanaudière", professionalCount: 32, serviceCategoryCount: 11, featuredProblems: ["Toiture", "Électricité", "Chauffage"], intro: "Ville riveraine avec un beau mix de propriétés unifamiliales et de condos." },
  { name: "Blainville", slug: "blainville", region: "Laurentides", professionalCount: 28, serviceCategoryCount: 10, featuredProblems: ["Rénovation cuisine", "Isolation", "Paysagement"], intro: "Banlieue prisée des familles avec de nombreuses propriétés en phase de rénovation." },
  { name: "Brossard", slug: "brossard", region: "Montérégie", professionalCount: 41, serviceCategoryCount: 13, featuredProblems: ["Condo entretien", "Fenêtres", "Thermopompe"], intro: "Hub multiculturel de la Rive-Sud avec un marché condo en plein essor." },
  { name: "Saint-Constant", slug: "saint-constant", region: "Montérégie", professionalCount: 18, serviceCategoryCount: 9, featuredProblems: ["Drain français", "Toiture", "Fondation"], intro: "Petite ville en expansion avec un parc de maisons relativement récentes." },
  { name: "Québec", slug: "quebec", region: "Capitale-Nationale", professionalCount: 156, serviceCategoryCount: 16, featuredProblems: ["Fondation pierre", "Toiture patrimoniale", "Isolation"], intro: "Capitale nationale avec un patrimoine bâti unique et des défis de conservation importants." },
];
