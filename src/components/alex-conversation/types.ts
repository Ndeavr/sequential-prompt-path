/**
 * Types for Alex Conversational Lite + Analysis Engine
 */

export interface ConversationMessage {
  id: string;
  role: "user" | "alex" | "system";
  content: string;
  cardType?: InlineCardType;
  cardData?: any;
  timestamp: number;
}

export type InlineCardType =
  | "entrepreneur"
  | "availability"
  | "urgency"
  | "project_suggestion"
  | "profile_completion"
  | "login_prompt"
  | "quote_comparison"
  | "passport_maison"
  | "no_match"
  | "business_analysis"
  | "quote_analysis"
  | "photo_design"
  | "photo_problem"
  | "aipp_score"
  | "improvement_actions"
  | "upload_photo"
  | "upload_quote"
  | "problem_summary"
  | "address_required"
  | "booking_next_step";

export interface MockContractor {
  id: string;
  name: string;
  specialty: string;
  city: string;
  score: number;
  badges: string[];
  delayDays: number;
  avatarUrl?: string;
}

export interface MockSlot {
  id: string;
  contractorId: string;
  start: string;
  end: string;
  label: string;
}

export interface BusinessAnalysisData {
  entityName: string;
  aippScore: number;
  seoScore: number;
  trustScore: number;
  visibilityScore: number;
  overallGrade: string;
  recommendations: string[];
}

export interface QuoteAnalysisData {
  supplierName: string;
  totalAmount: number;
  taxGst: number;
  taxQst: number;
  itemCount: number;
  anomalies: string[];
  qualityScore: number;
  priceComparison: "below_market" | "market" | "above_market";
  verdict: string;
}

export interface PhotoDesignData {
  roomType: string;
  detectedStyle: string;
  suggestions: Array<{ style: string; description: string; confidence: number }>;
  imageUrl?: string;
}

export interface PhotoProblemData {
  issueType: string;
  severity: "low" | "medium" | "high" | "critical";
  probableCause: string;
  recommendedSolution: string;
  estimatedCost: string;
  urgency: string;
  imageUrl?: string;
}

export const MOCK_CONTRACTORS: MockContractor[] = [
  {
    id: "c1",
    name: "Rénovations Prestige Montréal",
    specialty: "Plomberie résidentielle",
    city: "Montréal",
    score: 92,
    badges: ["Certifié UNPRO", "Top 10%"],
    delayDays: 2,
  },
  {
    id: "c2",
    name: "Pro-Électrique Laval",
    specialty: "Électricité générale",
    city: "Laval",
    score: 87,
    badges: ["Vérifié", "Réponse rapide"],
    delayDays: 3,
  },
  {
    id: "c3",
    name: "Toitures Québec Plus",
    specialty: "Toiture et isolation",
    city: "Québec",
    score: 84,
    badges: ["Certifié RBQ"],
    delayDays: 5,
  },
];

export const MOCK_SLOTS: MockSlot[] = [
  { id: "s1", contractorId: "c1", start: "2026-04-14T09:00", end: "2026-04-14T10:00", label: "Lun 14 avr · 9h" },
  { id: "s2", contractorId: "c1", start: "2026-04-14T14:00", end: "2026-04-14T15:00", label: "Lun 14 avr · 14h" },
  { id: "s3", contractorId: "c1", start: "2026-04-15T10:00", end: "2026-04-15T11:00", label: "Mar 15 avr · 10h" },
  { id: "s4", contractorId: "c2", start: "2026-04-16T08:00", end: "2026-04-16T09:00", label: "Mer 16 avr · 8h" },
];

export const MOCK_BUSINESS_ANALYSIS: BusinessAnalysisData = {
  entityName: "Plomberie Express Montréal",
  aippScore: 72,
  seoScore: 45,
  trustScore: 83,
  visibilityScore: 38,
  overallGrade: "B",
  recommendations: [
    "Ajouter des photos de réalisations récentes",
    "Compléter le profil Google Business",
    "Activer les avis clients vérifiés",
    "Optimiser la description des services",
  ],
};

export const MOCK_QUOTE_ANALYSIS: QuoteAnalysisData = {
  supplierName: "Toitures ABC Inc.",
  totalAmount: 18500,
  taxGst: 925,
  taxQst: 1845.19,
  itemCount: 12,
  anomalies: [
    "Frais de déplacement inhabituellement élevés",
    "Garantie non spécifiée sur les matériaux",
  ],
  qualityScore: 68,
  priceComparison: "above_market",
  verdict: "Soumission au-dessus du marché. Négociez les frais de déplacement et exigez une garantie écrite.",
};

export const MOCK_PHOTO_DESIGN: PhotoDesignData = {
  roomType: "Cuisine",
  detectedStyle: "Contemporain",
  suggestions: [
    { style: "Moderne minimaliste", description: "Lignes épurées, couleurs neutres, comptoirs en quartz", confidence: 0.92 },
    { style: "Scandinave chaleureux", description: "Bois naturel, blanc, accents cuivre", confidence: 0.85 },
    { style: "Industriel raffiné", description: "Béton, métal noir, éclairage suspendu", confidence: 0.78 },
  ],
};

export const MOCK_PHOTO_PROBLEM: PhotoProblemData = {
  issueType: "Infiltration d'eau",
  severity: "high",
  probableCause: "Joint de calfeutrage dégradé autour de la fenêtre. Possibilité de membrane déficiente sous le revêtement.",
  recommendedSolution: "Inspection complète par un expert en enveloppe du bâtiment. Remplacement du calfeutrage et vérification de la membrane.",
  estimatedCost: "800 $ – 2 500 $",
  urgency: "Intervention recommandée sous 7 jours pour éviter des dommages structuraux.",
};
