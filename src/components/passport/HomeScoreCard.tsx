/**
 * UNPRO — Home Score Card
 * Displays global /100 score with factor breakdown and interpretation bands.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  ShieldCheck, AlertTriangle, Info, TrendingUp, ChevronDown,
} from "lucide-react";
import { useState } from "react";
import type { HomeScoreOutput, ScoreFactor } from "@/services/homeScoreService";

interface Props {
  score: HomeScoreOutput | null;
  loading?: boolean;
}

const bandConfig = (s: number) => {
  if (s >= 80) return { label: "Condition solide", bg: "bg-success/10", text: "text-success", ring: "ring-success/20" };
  if (s >= 60) return { label: "Bonne condition", bg: "bg-accent/10", text: "text-accent", ring: "ring-accent/20" };
  if (s >= 40) return { label: "Attention requise", bg: "bg-warning/10", text: "text-warning", ring: "ring-warning/20" };
  return { label: "Risque élevé", bg: "bg-destructive/10", text: "text-destructive", ring: "ring-destructive/20" };
};

const confidenceIcon = (c: ScoreFactor["confidence"]) => {
  if (c === "high") return <ShieldCheck className="w-3 h-3 text-success" />;
  if (c === "medium") return <Info className="w-3 h-3 text-warning" />;
  return <AlertTriangle className="w-3 h-3 text-destructive" />;
};

export default function HomeScoreCard({ score, loading }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <Card className="border-border/40 animate-pulse">
        <CardContent className="p-6 h-32" />
      </Card>
    );
  }

  if (!score) {
    return (
      <Card className="border-border/40">
        <CardContent className="p-6 text-center">
          <Info className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Complétez votre passeport pour obtenir votre Score Maison.
          </p>
        </CardContent>
      </Card>
    );
  }

  const band = bandConfig(score.overall);

  return (
    <Card className={`border-border/40 ${band.ring} ring-1 overflow-hidden`}>
      <CardContent className="p-0">
        {/* Header */}
        <div className={`px-5 py-4 ${band.bg}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Score Maison
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`font-display text-4xl font-bold ${band.text}`}
                >
                  {score.overall}
                </motion.span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className={`${band.text} border-current text-xs`}>
                {band.label}
              </Badge>
              <p className="text-[10px] text-muted-foreground mt-1">
                {score.scoreType === "enriched" ? "Score enrichi" : score.scoreType === "certified" ? "Score certifié" : "Score estimé"}
              </p>
            </div>
          </div>
        </div>

        {/* Factor bars */}
        <div className="px-5 py-4 space-y-3">
          {score.factors.map((f) => (
            <div key={f.key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="flex items-center gap-1.5 text-foreground font-medium">
                  {confidenceIcon(f.confidence)}
                  {f.label}
                </span>
                <span className="text-muted-foreground">{f.score}/100</span>
              </div>
              <Progress value={f.score} className="h-1.5" />
            </div>
          ))}
        </div>

        {/* Expandable details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-5 py-2.5 border-t border-border/30 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? "Masquer les détails" : "Voir les détails"}
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>

        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="px-5 pb-4 space-y-2"
          >
            {score.factors.filter((f) => f.missingData || f.improvementTip).map((f) => (
              <div key={f.key} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 text-xs">
                <TrendingUp className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                <div>
                  {f.missingData && (
                    <p className="text-muted-foreground">{f.missingData}</p>
                  )}
                  {f.improvementTip && (
                    <p className="text-foreground">{f.improvementTip}</p>
                  )}
                </div>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground pt-1">
              Confiance : {score.confidenceLabel} ({score.confidenceLevel}%)
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
