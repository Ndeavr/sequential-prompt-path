/**
 * CardProblemPrediction — Shows the detected problem/symptom assessment inline in chat.
 */
import { motion } from "framer-motion";
import { AlertTriangle, Wrench, Thermometer, Droplets, Zap, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ProblemAssessmentData {
  symptom_label: string;
  probable_problem: string;
  recommended_trade: string;
  urgency_level: string;
  assessment_confidence: number;
  requires_photo?: boolean;
  requires_address?: boolean;
}

interface Props {
  assessment: ProblemAssessmentData;
}

const TRADE_ICONS: Record<string, any> = {
  plomberie: Droplets,
  électricité: Zap,
  chauffage: Thermometer,
  climatisation: Thermometer,
  toiture: Home,
};

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  emergency: { label: "Urgence", color: "bg-red-500" },
  high: { label: "Prioritaire", color: "bg-orange-500" },
  normal: { label: "Normal", color: "bg-blue-500" },
  low: { label: "Planifié", color: "bg-green-500" },
};

export default function CardProblemPrediction({ assessment }: Props) {
  const TradeIcon = TRADE_ICONS[assessment.recommended_trade] || Wrench;
  const urgency = URGENCY_CONFIG[assessment.urgency_level] || URGENCY_CONFIG.normal;

  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TradeIcon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              {assessment.symptom_label}
            </h4>
            <p className="text-xs text-muted-foreground">
              {assessment.probable_problem}
            </p>
          </div>
        </div>
        <Badge className={`${urgency.color} text-white text-[10px] px-2`}>
          {urgency.label}
        </Badge>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Wrench className="h-3 w-3" />
          {assessment.recommended_trade.replace(/_/g, " ")}
        </span>
        <span>·</span>
        <span>Confiance: {(assessment.assessment_confidence * 100).toFixed(0)}%</span>
      </div>

      {(assessment.requires_photo || assessment.requires_address) && (
        <div className="flex gap-2">
          {assessment.requires_photo && (
            <Badge variant="outline" className="text-[10px]">
              📸 Photo recommandée
            </Badge>
          )}
          {assessment.requires_address && (
            <Badge variant="outline" className="text-[10px]">
              📍 Adresse requise
            </Badge>
          )}
        </div>
      )}
    </motion.div>
  );
}
