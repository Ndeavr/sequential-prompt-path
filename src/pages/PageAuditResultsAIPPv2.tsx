/**
 * AIPP v2 — Premium Audit Results Dashboard
 * Real data. No placeholders. Loading skeletons when processing.
 */
import { useParams } from "react-router-dom";
import { useAIPPv2Results } from "@/hooks/useAIPPv2Audit";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

import CardScoreGlobalAIPP from "@/components/aipp-v2/CardScoreGlobalAIPP";
import WidgetRadarScoreBreakdown from "@/components/aipp-v2/WidgetRadarScoreBreakdown";
import PanelAEOReadiness from "@/components/aipp-v2/PanelAEOReadiness";
import PanelEntityAuthority from "@/components/aipp-v2/PanelEntityAuthority";
import PanelConversionIntelligence from "@/components/aipp-v2/PanelConversionIntelligence";
import PanelLocalDominance from "@/components/aipp-v2/PanelLocalDominance";
import PanelRevenueLeak from "@/components/aipp-v2/PanelRevenueLeak";
import ListRecommendationsAIPP from "@/components/aipp-v2/ListRecommendationsAIPP";
import CTAUpgradePlanAIPP from "@/components/aipp-v2/CTAUpgradePlanAIPP";
import PanelAlexInterpretation from "@/components/aipp-v2/PanelAlexInterpretation";
import PanelGrowthPotential from "@/components/aipp-v2/PanelGrowthPotential";
import PanelScoreBreakdownBars from "@/components/aipp-v2/PanelScoreBreakdownBars";

function LoadingSkeleton({ domain }: { domain?: string }) {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-4">
        {/* Processing header */}
        <motion.div
          className="bg-card border border-border rounded-2xl p-6 text-center space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto"
            animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-6 h-6 rounded-full bg-primary animate-pulse" />
          </motion.div>
          <p className="text-base font-semibold text-foreground">Analyse en cours…</p>
          {domain && (
            <p className="text-sm text-muted-foreground">
              Scan de <span className="text-foreground font-medium">{domain}</span>
            </p>
          )}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
            >Website</motion.span>
            <span>•</span>
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            >SEO technique</motion.span>
            <span>•</span>
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
            >Avis</motion.span>
            <span>•</span>
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.9 }}
            >RBQ / NEQ</motion.span>
          </div>
        </motion.div>

        {/* Score skeleton */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <Skeleton className="h-4 w-24 mx-auto" />
          <Skeleton className="h-32 w-32 rounded-full mx-auto" />
          <Skeleton className="h-3 w-16 mx-auto" />
        </div>

        {/* Breakdown bars skeleton */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>

        {/* Revenue skeleton */}
        <div className="bg-card border border-red-500/20 rounded-2xl p-5 space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>

        {/* Recommendations skeleton */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <Skeleton className="h-4 w-36" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PageAuditResultsAIPPv2() {
  const { auditId } = useParams<{ auditId: string }>();
  const { data, loading, isProcessing } = useAIPPv2Results(auditId);

  if (loading || !data) {
    return <LoadingSkeleton />;
  }

  if (isProcessing || !data.scores) {
    return <LoadingSkeleton domain={data.audit.domain} />;
  }

  const { scores, entities, recommendations, audit } = data;

  const stagger = (i: number) => ({ delay: i * 0.08 });

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={stagger(0)}>
          <CardScoreGlobalAIPP score={scores.score_global} domain={audit.domain} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={stagger(1)}>
          <PanelAlexInterpretation scores={scores} domain={audit.domain} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={stagger(2)}>
          <PanelScoreBreakdownBars scores={scores} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={stagger(3)}>
          <WidgetRadarScoreBreakdown scores={scores} />
        </motion.div>

        {scores.score_potential > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={stagger(4)}>
            <PanelGrowthPotential currentScore={scores.score_global} potentialScore={scores.score_potential} />
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={stagger(5)}>
          <PanelRevenueLeak revenueLoss={scores.revenue_loss_estimate} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={stagger(6)}>
          <PanelAEOReadiness score={scores.score_aeo} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={stagger(7)}>
          <PanelConversionIntelligence score={scores.score_conversion} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={stagger(8)}>
          <PanelLocalDominance score={scores.score_local} entities={entities} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={stagger(9)}>
          <PanelEntityAuthority entities={entities} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={stagger(10)}>
          <ListRecommendationsAIPP recommendations={recommendations} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={stagger(11)}>
          <CTAUpgradePlanAIPP />
        </motion.div>
      </div>
    </div>
  );
}
