import { motion } from "framer-motion";
import { AlertOctagon, Wrench, DollarSign, Clock } from "lucide-react";
import type { PhotoProblemData } from "./types";

interface Props {
  data: PhotoProblemData;
  onFindPro?: () => void;
}

const severityConfig = {
  low: { label: "Faible", color: "bg-blue-500/10 text-blue-600" },
  medium: { label: "Modéré", color: "bg-amber-500/10 text-amber-600" },
  high: { label: "Élevé", color: "bg-orange-500/10 text-orange-600" },
  critical: { label: "Critique", color: "bg-red-500/10 text-red-600" },
};

export default function CardPhotoProblemDiagnosis({ data, onFindPro }: Props) {
  const sev = severityConfig[data.severity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-destructive" />
          <div>
            <p className="text-xs text-muted-foreground">Diagnostic photo</p>
            <p className="text-sm font-semibold text-foreground">{data.issueType}</p>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sev.color}`}>
          {sev.label}
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-start gap-2">
          <Wrench className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-foreground">Cause probable</p>
            <p className="text-foreground/70">{data.probableCause}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Wrench className="w-3 h-3 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-foreground">Solution recommandée</p>
            <p className="text-foreground/70">{data.recommendedSolution}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg p-2">
            <DollarSign className="w-3 h-3 text-muted-foreground" />
            <div>
              <p className="text-[10px] text-muted-foreground">Estimation</p>
              <p className="font-semibold">{data.estimatedCost}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg p-2">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <div>
              <p className="text-[10px] text-muted-foreground">Urgence</p>
              <p className="font-semibold">{data.urgency.split(" ").slice(0, 3).join(" ")}</p>
            </div>
          </div>
        </div>
      </div>

      {onFindPro && (
        <button
          onClick={onFindPro}
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          Trouver un professionnel
        </button>
      )}
    </motion.div>
  );
}
