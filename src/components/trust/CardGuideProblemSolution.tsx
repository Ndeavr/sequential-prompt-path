/**
 * UNPRO — CardGuideProblemSolution
 * Shows a home problem guide card with symptom, cause, solution, cost.
 */
import { AlertTriangle, Wrench, DollarSign, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  slug: string;
  problem: string;
  symptoms: string[];
  solution: string;
  estimatedCostMin?: number;
  estimatedCostMax?: number;
  severity: string;
  category?: string;
}

const severityColors: Record<string, string> = {
  low: "text-sky-400 bg-sky-500/10",
  moderate: "text-amber-400 bg-amber-500/10",
  high: "text-orange-400 bg-orange-500/10",
  critical: "text-rose-400 bg-rose-500/10",
};

export default function CardGuideProblemSolution({
  slug,
  problem,
  symptoms,
  solution,
  estimatedCostMin,
  estimatedCostMax,
  severity,
  category,
}: Props) {
  const colors = severityColors[severity] || severityColors.moderate;

  return (
    <Link
      to={`/guides/${slug}`}
      className="glass-card rounded-2xl p-5 space-y-3 block group hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          {category && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {category}
            </span>
          )}
          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {problem}
          </h3>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colors}`}>
          {severity === "critical" ? "Urgent" : severity === "high" ? "Important" : severity === "low" ? "Mineur" : "Modéré"}
        </span>
      </div>

      {symptoms.length > 0 && (
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground line-clamp-1">
            {symptoms.slice(0, 2).join(" · ")}
          </p>
        </div>
      )}

      <div className="flex items-start gap-2">
        <Wrench className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground line-clamp-2">{solution}</p>
      </div>

      {(estimatedCostMin != null || estimatedCostMax != null) && (
        <div className="flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium text-foreground">
            {estimatedCostMin != null && estimatedCostMax != null
              ? `${estimatedCostMin}$ – ${estimatedCostMax}$`
              : estimatedCostMin != null
                ? `À partir de ${estimatedCostMin}$`
                : `Jusqu'à ${estimatedCostMax}$`}
          </span>
        </div>
      )}

      <div className="flex items-center gap-1 text-xs text-primary font-medium pt-1">
        Voir la solution <ChevronRight className="h-3 w-3" />
      </div>
    </Link>
  );
}
