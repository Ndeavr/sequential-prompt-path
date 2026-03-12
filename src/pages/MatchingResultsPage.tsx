/**
 * UNPRO — Matching Results Page
 * Shows ranked contractors for a homeowner's project.
 */

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Scale, Filter, SlidersHorizontal } from "lucide-react";
import MatchCard from "@/components/matching/MatchCard";
import CompareDrawer from "@/components/matching/CompareDrawer";
import AlexMatchingModule from "@/components/matching/AlexMatchingModule";
import { useMatchResults } from "@/hooks/useMatchingEngine";
import type { MatchEvaluation } from "@/types/matching";

// ─── Mock data for demo when no real matches exist ───
const MOCK_MATCHES: MatchEvaluation[] = [
  {
    id: "m1", contractor_id: "c1", user_id: "u1",
    project_fit_score: 88, property_fit_score: 82, ccai_score: 84, dna_fit_score: 78,
    raw_review_fit_score: 80, weighted_review_fit_score: 76,
    unpro_score_snapshot: 85, aipp_score_snapshot: 79,
    availability_score: 90, budget_fit_score: 75, risk_modifier: -2,
    recommendation_score: 86, success_probability: 84, conflict_risk_score: 15,
    explanations: {
      top_reasons: [
        { text_fr: "Excellente expérience en rénovation de cuisine", text_en: "Excellent kitchen renovation experience", icon: "wrench" },
        { text_fr: "Style de communication aligné", text_en: "Communication style aligned", icon: "message-circle" },
        { text_fr: "Fiabilité opérationnelle élevée", text_en: "High operational reliability", icon: "shield-check" },
      ],
      watchouts: [],
      review_highlights: ["Qualité des finis exceptionnelle", "Toujours ponctuel"],
      conflict_drivers: [],
    },
    business_name: "Rénovations Prestige Québec", specialty: "Rénovation cuisine",
    city: "Québec", province: "QC", rating: 4.8, review_count: 47,
    verification_status: "verified", years_experience: 15, logo_url: undefined,
  },
  {
    id: "m2", contractor_id: "c2", user_id: "u1",
    project_fit_score: 75, property_fit_score: 80, ccai_score: 72, dna_fit_score: 65,
    raw_review_fit_score: 70, weighted_review_fit_score: 68,
    unpro_score_snapshot: 78, aipp_score_snapshot: 72,
    availability_score: 85, budget_fit_score: 88, risk_modifier: -3,
    recommendation_score: 76, success_probability: 72, conflict_risk_score: 28,
    explanations: {
      top_reasons: [
        { text_fr: "Budget bien aligné avec votre fourchette", text_en: "Budget well aligned", icon: "dollar-sign" },
        { text_fr: "Disponible rapidement", text_en: "Available quickly", icon: "clock" },
      ],
      watchouts: [
        { text_fr: "Différences de style de travail possibles", text_en: "Work style differences possible", icon: "shuffle" },
      ],
      review_highlights: ["Bon rapport qualité-prix"],
      conflict_drivers: ["moderate_alignment"],
    },
    business_name: "Construction Martin & Fils", specialty: "Rénovation générale",
    city: "Lévis", province: "QC", rating: 4.5, review_count: 32,
    verification_status: "verified", years_experience: 22, logo_url: undefined,
  },
  {
    id: "m3", contractor_id: "c3", user_id: "u1",
    project_fit_score: 82, property_fit_score: 70, ccai_score: 68, dna_fit_score: 72,
    raw_review_fit_score: 85, weighted_review_fit_score: 78,
    unpro_score_snapshot: 80, aipp_score_snapshot: 85,
    availability_score: 70, budget_fit_score: 60, risk_modifier: -5,
    recommendation_score: 73, success_probability: 68, conflict_risk_score: 35,
    explanations: {
      top_reasons: [
        { text_fr: "Forte présence en ligne et crédibilité", text_en: "Strong online presence", icon: "globe" },
      ],
      watchouts: [
        { text_fr: "Budget potentiellement serré", text_en: "Budget may be tight", icon: "alert-circle" },
        { text_fr: "Risque de friction modéré", text_en: "Moderate friction risk", icon: "alert-triangle" },
      ],
      review_highlights: ["Travail de haute qualité"],
      conflict_drivers: ["budget_tension"],
    },
    business_name: "Atelier Bois Noble", specialty: "Ébénisterie / Menuiserie",
    city: "Montréal", province: "QC", rating: 4.9, review_count: 18,
    verification_status: "verified", years_experience: 8, logo_url: undefined,
  },
];

const MatchingResultsPage = () => {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("project") ?? undefined;
  const { data: realMatches, isLoading } = useMatchResults(projectId);

  const matches = (realMatches?.length ?? 0) > 0 ? realMatches! : MOCK_MATCHES;
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filteredMatches = useMemo(() => {
    if (!activeFilter) return matches;
    switch (activeFilter) {
      case "safe": return [...matches].sort((a, b) => a.conflict_risk_score - b.conflict_risk_score);
      case "budget": return [...matches].sort((a, b) => b.budget_fit_score - a.budget_fit_score);
      case "communication": return [...matches].sort((a, b) => b.ccai_score - a.ccai_score);
      default: return matches;
    }
  }, [matches, activeFilter]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const compareMatches = matches.filter((m) => compareIds.has(m.contractor_id));

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/30">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
          <div className="relative max-w-2xl mx-auto px-4 py-8 sm:py-12">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Badge variant="outline" className="mb-3 text-xs border-primary/20 text-primary">
                Moteur de compatibilité UNPRO
              </Badge>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-2">
                Vos meilleurs matchs
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {matches.length} entrepreneurs analysés et classés par compatibilité avec votre projet, 
                votre propriété et votre style.
              </p>
            </motion.div>
          </div>
        </section>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {/* Alex Module */}
          <AlexMatchingModule
            matchCount={matches.length}
            topScore={matches[0]?.recommendation_score}
            onFilter={(f) => setActiveFilter(f === activeFilter ? null : f)}
          />

          {/* Active Filter */}
          {activeFilter && (
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">Filtre actif:</span>
              <Badge variant="secondary" className="text-[10px]">{activeFilter}</Badge>
              <button onClick={() => setActiveFilter(null)} className="text-xs text-primary hover:underline ml-auto">
                Réinitialiser
              </button>
            </div>
          )}

          {/* Compare Bar */}
          {compareIds.size >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky top-2 z-20"
            >
              <Button
                onClick={() => setCompareOpen(true)}
                className="w-full"
                variant="premium"
                size="lg"
              >
                <Scale className="w-4 h-4 mr-2" />
                Comparer {compareIds.size} entrepreneurs
              </Button>
            </motion.div>
          )}

          {/* Match Cards */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMatches.map((match, i) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  rank={i + 1}
                  onCompare={toggleCompare}
                  isComparing={compareIds.has(match.contractor_id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Compare Drawer */}
        <CompareDrawer
          matches={compareMatches}
          open={compareOpen}
          onOpenChange={setCompareOpen}
          onRemove={(id) => toggleCompare(id)}
        />
      </div>
    </MainLayout>
  );
};

export default MatchingResultsPage;
