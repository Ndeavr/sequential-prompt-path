/**
 * PageMatchResultsDynamic — Shows 1-3 matched contractors with DNA breakdown.
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import MainLayout from "@/layouts/MainLayout";
import CardContractorMatchScore from "@/components/intent-funnel/CardContractorMatchScore";
import PanelDNAFitBreakdown from "@/components/intent-funnel/PanelDNAFitBreakdown";
import { useDNAMatchScore, useRankContractors, type MatchedContractor } from "@/hooks/useIntentFunnel";

export default function PageMatchResultsDynamic() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { computeScore } = useDNAMatchScore();
  const { rank } = useRankContractors();
  const [contractors, setContractors] = useState<MatchedContractor[]>([]);
  const [selected, setSelected] = useState<MatchedContractor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    computeScore(sessionId, {}).then((results) => {
      const ranked = rank(results, 3);
      setContractors(ranked);
      if (ranked.length > 0) setSelected(ranked[0]);
      setLoading(false);
    });
  }, [sessionId, computeScore, rank]);

  const handleBook = (contractorId: string) => {
    navigate(`/book/${contractorId}`);
  };

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Vos recommandations</title>
        <meta name="description" content="Voici les professionnels recommandés par Alex pour votre projet." />
      </Helmet>

      <div className="px-5 pt-12 pb-24 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">Vos recommandations</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {contractors.length > 0 ? `${contractors.length} professionnel${contractors.length > 1 ? "s" : ""} recommandé${contractors.length > 1 ? "s" : ""}` : "Recherche en cours…"}
          </p>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {contractors.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <CardContractorMatchScore
                  contractor={c}
                  isPrimary={c.rank === 1}
                  onBook={() => handleBook(c.id)}
                  onSelect={() => setSelected(c)}
                  isSelected={selected?.id === c.id}
                />
              </motion.div>
            ))}
          </div>
        )}

        {selected && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <PanelDNAFitBreakdown breakdown={selected.breakdown} contractorName={selected.business_name} />
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
}
