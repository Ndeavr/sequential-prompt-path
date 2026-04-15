/**
 * CardPhotoAnalysisResult — Visual analysis summary with confidence and recommendation.
 */
import { motion } from "framer-motion";
import { Eye, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import type { VisualAnalysisResult } from "@/services/alexVisualIntelligenceEngine";
import BadgeConfidenceScore from "./BadgeConfidenceScore";

interface Props {
  analysis: VisualAnalysisResult;
  onNextStep?: () => void;
}

const RISK_COLORS: Record<string, string> = {
  low: "text-emerald-400",
  medium: "text-amber-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

const RISK_LABELS: Record<string, string> = {
  low: "Risque faible",
  medium: "Risque modéré",
  high: "Risque élevé",
  critical: "Risque critique",
};

export default function CardPhotoAnalysisResult({ analysis, onNextStep }: Props) {
  const riskColor = RISK_COLORS[analysis.riskLevel] || "text-amber-400";
  const RiskIcon = analysis.riskLevel === "critical" || analysis.riskLevel === "high" ? AlertTriangle : CheckCircle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-border/30 bg-card/80 backdrop-blur-sm p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Analyse visuelle</span>
        </div>
        <BadgeConfidenceScore score={analysis.confidenceScore} />
      </div>

      {/* Summary */}
      <p className="text-sm text-foreground leading-relaxed">{analysis.summary}</p>

      {/* Issue detected */}
      {analysis.issueDetected && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
          <RiskIcon className={`w-4 h-4 mt-0.5 shrink-0 ${riskColor}`} />
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-foreground">{analysis.issueDetected}</p>
            <p className={`text-[10px] ${riskColor}`}>{RISK_LABELS[analysis.riskLevel]}</p>
          </div>
        </div>
      )}

      {/* Recommendation */}
      <div className="text-xs text-muted-foreground">
        <span className="font-medium">Recommandation :</span> {analysis.recommendation}
      </div>

      {/* Intervention type */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-muted-foreground/70">
          Intervention : {analysis.interventionType}
        </span>
        {onNextStep && (
          <button
            onClick={onNextStep}
            className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          >
            Trouver un professionnel <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
