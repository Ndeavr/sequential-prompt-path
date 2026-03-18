export interface MockContractor {
  id: string;
  name: string;
  category: string;
  city: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  badges: string[];
  nextAvailability: string;
  pricingStyle: string;
  description: string;
  avatar?: string;
}

export const MOCK_CONTRACTORS: MockContractor[] = [
  {
    id: "c1", name: "Toitures Laval Pro", category: "Toiture", city: "Laval",
    specialties: ["Bardeaux", "Toiture plate", "Réparation urgente"],
    rating: 4.8, reviewCount: 47, badges: ["Vérifié", "Urgence 24/7", "Réponse rapide"],
    nextAvailability: "Disponible cette semaine", pricingStyle: "Soumission gratuite",
    description: "Spécialiste en toiture résidentielle depuis 22 ans. Garantie complète sur tous les travaux.",
  },
  {
    id: "c2", name: "Isolation Écomax", category: "Isolation", city: "Terrebonne",
    specialties: ["Laine soufflée", "Mousse polyuréthane", "Grenier"],
    rating: 4.9, reviewCount: 63, badges: ["Vérifié", "Très demandé"],
    nextAvailability: "Disponible dans 3 jours", pricingStyle: "Diagnostic 75$",
    description: "Expert en isolation thermique. Réduction garantie de vos coûts de chauffage.",
  },
  {
    id: "c3", name: "Fondations Québec Inc.", category: "Fondation", city: "Longueuil",
    specialties: ["Fissures", "Drain français", "Imperméabilisation"],
    rating: 4.7, reviewCount: 31, badges: ["Vérifié", "Diagnostic disponible"],
    nextAvailability: "Disponible la semaine prochaine", pricingStyle: "Inspection 150$",
    description: "Experts en réparation de fondations. Plus de 15 ans d'expérience au Québec.",
  },
  {
    id: "c4", name: "Électricité Moderne", category: "Électricité", city: "Montréal",
    specialties: ["Panneau électrique", "Mise aux normes", "Domotique"],
    rating: 4.6, reviewCount: 89, badges: ["Vérifié", "Réponse rapide", "Urgence 24/7"],
    nextAvailability: "Disponible demain", pricingStyle: "Soumission gratuite",
    description: "Maître électricien certifié. Résidentiel et commercial.",
  },
  {
    id: "c5", name: "Plomberie Alliance", category: "Plomberie", city: "Laval",
    specialties: ["Tuyauterie", "Chauffe-eau", "Drain français"],
    rating: 4.5, reviewCount: 56, badges: ["Vérifié", "Urgence 24/7"],
    nextAvailability: "Disponible aujourd'hui", pricingStyle: "Appel de service 95$",
    description: "Service de plomberie rapide et fiable. Urgences 24/7 dans tout Laval.",
  },
  {
    id: "c6", name: "Rénovation Prestige", category: "Rénovation générale", city: "Blainville",
    specialties: ["Cuisine", "Salle de bain", "Sous-sol"],
    rating: 4.8, reviewCount: 72, badges: ["Vérifié", "Très demandé", "Diagnostic disponible"],
    nextAvailability: "Disponible dans 2 semaines", pricingStyle: "Consultation gratuite",
    description: "Rénovations clé en main. Design, plans et exécution sous un même toit.",
  },
  {
    id: "c7", name: "Fenêtres Nordik", category: "Fenêtres", city: "Repentigny",
    specialties: ["PVC", "Aluminium", "Portes-patio"],
    rating: 4.4, reviewCount: 38, badges: ["Vérifié"],
    nextAvailability: "Disponible dans 5 jours", pricingStyle: "Soumission gratuite",
    description: "Installation et remplacement de fenêtres écoénergétiques.",
  },
  {
    id: "c8", name: "Thermopompes Confort+", category: "Thermopompe", city: "Brossard",
    specialties: ["Murale", "Centrale", "Géothermie"],
    rating: 4.7, reviewCount: 44, badges: ["Vérifié", "Réponse rapide"],
    nextAvailability: "Disponible cette semaine", pricingStyle: "Évaluation gratuite",
    description: "Vente, installation et entretien de thermopompes. Subventions disponibles.",
  },
];
