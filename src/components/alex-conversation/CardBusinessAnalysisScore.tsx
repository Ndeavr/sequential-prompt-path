import { motion } from "framer-motion";
import { TrendingUp, Eye, Shield, Search, ArrowRight } from "lucide-react";
import type { BusinessAnalysisData } from "./types";

interface Props {
  data: BusinessAnalysisData;
  onViewDetails?: () => void;
}

function ScoreBar({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  const color = value >= 75 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="w-3 h-3" /> {label}
        </span>
        <span className="font-semibold text-foreground">{value}/100</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default function CardBusinessAnalysisScore({ data, onViewDetails }: Props) {
  const gradeColor = data.aippScore >= 75 ? "text-emerald-500" : data.aippScore >= 50 ? "text-amber-500" : "text-red-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">Analyse business</p>
          <p className="text-sm font-semibold text-foreground">{data.entityName}</p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-bold ${gradeColor}`}>{data.overallGrade}</p>
          <p className="text-[10px] text-muted-foreground">Grade</p>
        </div>
      </div>

      <div className="space-y-2.5">
        <ScoreBar label="Score AIPP" value={data.aippScore} icon={TrendingUp} />
        <ScoreBar label="Visibilité IA" value={data.visibilityScore} icon={Eye} />
        <ScoreBar label="Confiance" value={data.trustScore} icon={Shield} />
        <ScoreBar label="SEO" value={data.seoScore} icon={Search} />
      </div>

      {data.recommendations.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Actions recommandées</p>
          {data.recommendations.slice(0, 3).map((rec, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-foreground/80">
              <span className="text-primary mt-0.5">→</span>
              <span>{rec}</span>
            </div>
          ))}
        </div>
      )}

      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors pt-1"
        >
          Voir l'analyse complète <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
}
