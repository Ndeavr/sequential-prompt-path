/**
 * UNPRO — Decision Assistant Page
 * "Quel entrepreneur contacter en premier ?"
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Info, HelpCircle } from "lucide-react";
import DecisionCard from "@/components/matching/DecisionCard";
import {
  generateDecisionSuggestions,
  type DecisionContractor,
} from "@/services/contractor/decisionAssistantEngine";

// ─── Demo contractors ───
const DEMO: DecisionContractor[] = [
  {
    id: "c1", business_name: "Rénovations Prestige Québec", city: "Québec", province: "QC",
    rating: 4.8, review_count: 47, verification_status: "verified", admin_verified: true,
    years_experience: 15, specialty: "Rénovation cuisine", website: "https://renovprestige.ca",
    unpro_score: 85, aipp_score: 79, quote_quality_score: 82, service_match: "exact",
    ccai_score: 78, dna_fit_score: 72, budget_fit_score: 75, missing_proofs: [],
  },
  {
    id: "c2", business_name: "Construction Martin & Fils", city: "Lévis", province: "QC",
    rating: 4.5, review_count: 32, verification_status: "verified", admin_verified: false,
    years_experience: 22, specialty: "Rénovation générale", website: "https://martinetfils.com",
    unpro_score: 68, aipp_score: 72, quote_quality_score: 55, service_match: "partial",
    ccai_score: 62, dna_fit_score: 58, budget_fit_score: 88, missing_proofs: ["Assurance responsabilité"],
  },
  {
    id: "c3", business_name: "Atelier Bois Noble", city: "Montréal", province: "QC",
    rating: 4.9, review_count: 18, verification_status: "verified", admin_verified: false,
    years_experience: 8, specialty: "Ébénisterie",
    unpro_score: 72, aipp_score: 85, service_match: "partial",
    ccai_score: 55, dna_fit_score: 65, missing_proofs: ["RBQ non confirmé", "Assurance"],
  },
  {
    id: "c4", business_name: "Pro Isolation Québec", city: "Québec", province: "QC",
    rating: 4.2, review_count: 8, verification_status: "pending", admin_verified: false,
    years_experience: 5, specialty: "Isolation",
    unpro_score: 38, aipp_score: 42, service_match: "unknown",
    ccai_score: 45, dna_fit_score: 40, missing_proofs: ["RBQ", "NEQ", "Assurance"],
  },
];

const DecisionAssistantPage = () => {
  const result = useMemo(
    () => generateDecisionSuggestions(DEMO, { targetCity: "Québec" }),
    []
  );

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/30">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
          <div className="relative max-w-2xl mx-auto px-4 py-6 sm:py-10">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 text-xs">
                <Link to="/matching">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Résultats
                </Link>
              </Button>
              <Badge variant="outline" className="mb-3 text-xs border-primary/20 text-primary">
                <HelpCircle className="w-3 h-3 mr-1" /> Assistant de décision
              </Badge>
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight mb-2">
                Quel entrepreneur contacter en premier ?
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {result.summary_fr}
              </p>
            </motion.div>
          </div>
        </section>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {/* Alex tip */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-secondary/5">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs font-semibold mb-1">Conseil d'Alex</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  L'ordre de contact est basé sur la pertinence du service, le statut de vérification,
                  la confiance, la qualité de la soumission et la proximité. Ce n'est pas un classement absolu —
                  consultez les explications pour chaque suggestion.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Decision Cards */}
          {result.suggestions.map((suggestion) => (
            <DecisionCard key={suggestion.contractor.id} suggestion={suggestion} />
          ))}

          {/* Disclaimer */}
          <p className="text-[10px] text-muted-foreground flex items-start gap-1 px-1">
            <Info className="w-3 h-3 shrink-0 mt-0.5" />
            Les suggestions sont basées sur les données disponibles et ne constituent pas une recommandation formelle.
            Vérifiez toujours les informations directement avec l'entrepreneur.
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default DecisionAssistantPage;
