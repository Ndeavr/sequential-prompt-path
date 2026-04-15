/**
 * AIPP v2 — Audit Results Dashboard
 * Shows full score breakdown, entities, recommendations, revenue leak.
 */
import { useParams } from "react-router-dom";
import { useAIPPv2Results } from "@/hooks/useAIPPv2Audit";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

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

export default function PageAuditResultsAIPPv2() {
  const { auditId } = useParams<{ auditId: string }>();
  const { data, loading, isProcessing } = useAIPPv2Results(auditId);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isProcessing || !data.scores) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
        <motion.div
          className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </motion.div>
        <p className="text-lg font-semibold text-foreground mb-2">Analyse en cours…</p>
        <p className="text-sm text-muted-foreground">
          Nous analysons <span className="text-foreground font-medium">{data.audit.domain}</span> comme une IA le ferait.
        </p>
      </div>
    );
  }

  const { scores, entities, recommendations, audit } = data;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <CardScoreGlobalAIPP score={scores.score_global} domain={audit.domain} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <PanelAlexInterpretation scores={scores} domain={audit.domain} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <WidgetRadarScoreBreakdown scores={scores} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <PanelRevenueLeak revenueLoss={scores.revenue_loss_estimate} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <PanelAEOReadiness score={scores.score_aeo} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <PanelConversionIntelligence score={scores.score_conversion} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <PanelLocalDominance score={scores.score_local} entities={entities} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <PanelEntityAuthority entities={entities} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <ListRecommendationsAIPP recommendations={recommendations} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <CTAUpgradePlanAIPP />
        </motion.div>
      </div>
    </div>
  );
}
