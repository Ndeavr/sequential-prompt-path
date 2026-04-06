/**
 * PageEntrepreneurImportProcessing — Full-page import terminal experience.
 * Used during contractor onboarding when data is being imported.
 */
import { useNavigate } from "react-router-dom";
import HeroSectionImportRealtimeTerminal from "@/components/import-terminal/HeroSectionImportRealtimeTerminal";
import type { ImportData } from "@/hooks/useTerminalImportAnimation";

// Mock data for demo — in production, this comes from the import pipeline
const DEMO_IMPORT_DATA: ImportData = {
  businessName: "Rénovations Martin",
  category: "Rénovation résidentielle",
  phone: "(514) 555-1234",
  city: "Montréal",
  website: "renovationsmartin.ca",
  logoUrl: "detected",
  photoCount: 18,
  photoTags: ["façade", "chantier", "équipe", "avant/après"],
  reviewCount: 127,
  averageRating: 4.8,
  reviewThemes: ["ponctualité", "propreté", "professionnalisme", "explications"],
  rbqStatus: "valid",
  neqStatus: "valid",
  aippScore: 74,
  aippDimensions: {
    "Identité": 85,
    "Réputation": 78,
    "Présence web": 62,
    "Conversion": 55,
    "Confiance": 82,
    "SEO local": 68,
    "Préparation IA": 45,
    "Engagement": 71,
  },
  recommendedPlan: "Premium",
  planReason: "Votre score AIPP et votre volume d'avis justifient un plan Premium pour maximiser vos rendez-vous qualifiés.",
};

export default function PageEntrepreneurImportProcessing() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ background: "linear-gradient(180deg, hsl(160 20% 3%) 0%, hsl(220 20% 4%) 50%, hsl(160 15% 3%) 100%)" }}
    >
      <HeroSectionImportRealtimeTerminal
        importData={DEMO_IMPORT_DATA}
        presetCode="balanced_default"
        onPlanActivate={(plan) => navigate(`/entrepreneur/checkout?plan=${plan.toLowerCase()}`)}
        onComplete={() => {}}
      />
    </div>
  );
}
