import { Card, CardContent } from "@/components/ui/card";
import { BadgeAIPPLevel } from "./BadgeAIPPLevel";
import { TrendingUp, AlertTriangle, Zap } from "lucide-react";

interface Props {
  score: {
    score_global: number;
    score_level: string;
    visibility_score: number;
    structure_score: number;
    trust_score: number;
    conversion_score: number;
    content_score: number;
    local_presence_score: number;
    ai_readiness_score: number;
    summary_headline: string;
    summary_short: string;
    top_issues: Array<{ key: string; label: string; note: string }>;
    quick_wins: Array<{ key: string; label: string }>;
  };
}

const dimensions = [
  { key: "visibility_score", label: "Visibilité" },
  { key: "structure_score", label: "Structure" },
  { key: "trust_score", label: "Confiance" },
  { key: "conversion_score", label: "Conversion" },
  { key: "content_score", label: "Contenu" },
  { key: "local_presence_score", label: "Local" },
  { key: "ai_readiness_score", label: "IA Ready" },
];

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function CardProspectAIPPScore({ score }: Props) {
  return (
    <Card className="border-border/40">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Score AIPP</span>
          </div>
          <BadgeAIPPLevel level={score.score_level} />
        </div>

        {/* Global Score */}
        <div className="text-center py-3">
          <div className="text-4xl font-bold tracking-tight">
            {score.score_global}
            <span className="text-lg text-muted-foreground font-normal">/100</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{score.summary_headline}</p>
        </div>

        {/* Dimension Bars */}
        <div className="space-y-2">
          {dimensions.map(d => (
            <ScoreBar key={d.key} label={d.label} value={(score as any)[d.key] || 0} />
          ))}
        </div>

        {/* Summary */}
        <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/30 pt-3">
          {score.summary_short}
        </p>

        {/* Top Issues */}
        {score.top_issues?.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 text-xs font-medium text-red-400">
              <AlertTriangle className="h-3 w-3" /> Faiblesses principales
            </div>
            {score.top_issues.map((issue, i) => (
              <div key={i} className="text-xs text-muted-foreground pl-4">• {issue.label}</div>
            ))}
          </div>
        )}

        {/* Quick Wins */}
        {score.quick_wins?.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 text-xs font-medium text-emerald-400">
              <Zap className="h-3 w-3" /> Gains rapides
            </div>
            {score.quick_wins.map((win, i) => (
              <div key={i} className="text-xs text-muted-foreground pl-4">• {win.label}</div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
