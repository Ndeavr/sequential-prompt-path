/**
 * UNPRO — Contractor Comparison Page
 * Standalone page for comparing 2–5 contractors.
 */

import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import MainLayout from "@/layouts/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Scale } from "lucide-react";
import ContractorComparisonView from "@/components/matching/ContractorComparisonView";
import type { ComparisonContractor } from "@/services/contractor/comparisonEngine";

// ─── Demo data ───
const DEMO_CONTRACTORS: ComparisonContractor[] = [
  {
    id: "c1", business_name: "Rénovations Prestige Québec", city: "Québec", province: "QC",
    rating: 4.8, review_count: 47, verification_status: "verified", admin_verified: true,
    years_experience: 15, specialty: "Rénovation cuisine", website: "https://renovprestige.ca",
    unpro_score: 85, aipp_score: 79, quote_quality_score: 82, quote_quality_tier: "bien_structure",
    service_match: "exact", missing_proofs: [],
  },
  {
    id: "c2", business_name: "Construction Martin & Fils", city: "Lévis", province: "QC",
    rating: 4.5, review_count: 32, verification_status: "verified", admin_verified: false,
    years_experience: 22, specialty: "Rénovation générale", website: "https://martinetfils.com",
    unpro_score: 68, aipp_score: 72, quote_quality_score: 55, quote_quality_tier: "partiel",
    service_match: "partial", missing_proofs: ["Assurance responsabilité"],
  },
  {
    id: "c3", business_name: "Atelier Bois Noble", city: "Montréal", province: "QC",
    rating: 4.9, review_count: 18, verification_status: "verified", admin_verified: false,
    years_experience: 8, specialty: "Ébénisterie",
    unpro_score: 72, aipp_score: 85, service_match: "partial",
    missing_proofs: ["RBQ non confirmé", "Assurance"],
  },
];

const ContractorComparisonPage = () => {
  const [searchParams] = useSearchParams();
  // In production, load contractors by IDs from search params
  const [contractors, setContractors] = useState<ComparisonContractor[]>(DEMO_CONTRACTORS);

  const handleRemove = (id: string) => {
    setContractors((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/30">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
          <div className="relative max-w-3xl mx-auto px-4 py-6 sm:py-10">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 text-xs">
                <Link to="/matching">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Retour aux résultats
                </Link>
              </Button>
              <Badge variant="outline" className="mb-3 text-xs border-primary/20 text-primary">
                <Scale className="w-3 h-3 mr-1" /> Comparaison intelligente
              </Badge>
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight mb-2">
                Comparer vos entrepreneurs
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Les différences sont expliquées sans établir de classement.
                Chaque entrepreneur a des forces distinctes.
              </p>
            </motion.div>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 py-6">
          {contractors.length >= 2 ? (
            <ContractorComparisonView
              contractors={contractors}
              onRemove={handleRemove}
              targetCity="Québec"
            />
          ) : (
            <div className="text-center py-12">
              <Scale className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Sélectionnez au moins 2 entrepreneurs pour comparer.
              </p>
              <Button asChild className="mt-4">
                <Link to="/matching">Voir les résultats de matching</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ContractorComparisonPage;
