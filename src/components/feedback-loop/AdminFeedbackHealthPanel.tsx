/**
 * UNPRO — Feedback Loop Health Panel
 * Displays prediction vs reality variance.
 */
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, TrendingUp, TrendingDown, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import type { VarianceReport } from "@/lib/feedbackLoopEngine";

interface Props {
  report: VarianceReport | null;
  isLoading: boolean;
}

const directionIcon = (dir: string) => {
  if (dir === "optimistic") return <TrendingUp className="h-3.5 w-3.5 text-orange-400" />;
  if (dir === "pessimistic") return <TrendingDown className="h-3.5 w-3.5 text-blue-400" />;
  return <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />;
};

const directionLabel = (dir: string) => {
  if (dir === "optimistic") return "Trop optimiste";
  if (dir === "pessimistic") return "Trop pessimiste";
  return "Précis";
};

const healthColor = (h: string) => {
  if (h === "healthy") return "text-emerald-400";
  if (h === "drifting") return "text-amber-400";
  return "text-destructive";
};

const healthIcon = (h: string) => {
  if (h === "healthy") return <CheckCircle className="h-5 w-5 text-emerald-400" />;
  if (h === "drifting") return <AlertTriangle className="h-5 w-5 text-amber-400" />;
  return <XCircle className="h-5 w-5 text-destructive" />;
};

export default function AdminFeedbackHealthPanel({ report, isLoading }: Props) {
  if (isLoading) return <Skeleton className="h-56 w-full rounded-2xl" />;

  if (!report) {
    return (
      <div className="rounded-2xl border border-border/30 bg-card/40 p-8 text-center">
        <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Pas assez de données pour calculer les écarts</p>
      </div>
    );
  }

  const items = [
    { label: "Valeur contrat", variance: report.valueVariance },
    { label: "Probabilité close", variance: report.closeVariance },
    { label: "Délai fermeture", variance: report.timeVariance },
    { label: "Taux présence", variance: report.showVariance },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/30 bg-card/60 p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-primary" />
          Boucle de feedback — Santé prédictive
        </h3>
        <div className="flex items-center gap-1.5">
          {healthIcon(report.overallHealth)}
          <span className={`text-xs font-bold capitalize ${healthColor(report.overallHealth)}`}>
            {report.overallHealth === "healthy" ? "Sain" : report.overallHealth === "drifting" ? "Dérive" : "Critique"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-border/20 bg-card/40 p-3 space-y-1">
            <div className="flex items-center gap-1.5">
              {directionIcon(item.variance.direction)}
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{item.variance.avg > 0 ? "+" : ""}{item.variance.avg}%</p>
            <p className="text-[9px] text-muted-foreground">{directionLabel(item.variance.direction)} · {item.variance.count} obs.</p>
          </div>
        ))}
      </div>

      {report.recommendations.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-foreground">Recommandations</p>
          {report.recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-muted-foreground">{r}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
