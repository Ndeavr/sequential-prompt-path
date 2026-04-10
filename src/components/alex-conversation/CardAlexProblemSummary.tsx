import { motion } from "framer-motion";
import { ClipboardCheck, AlertTriangle, Zap } from "lucide-react";

interface Props {
  problemType: string;
  projectType: string | null;
  urgency: string;
  summary: string;
}

const urgencyConfig: Record<string, { label: string; color: string; icon: typeof Zap }> = {
  emergency: { label: "Urgence", color: "text-destructive", icon: AlertTriangle },
  high: { label: "Prioritaire", color: "text-orange-500", icon: AlertTriangle },
  medium: { label: "Normal", color: "text-yellow-500", icon: Zap },
  low: { label: "Planifié", color: "text-muted-foreground", icon: ClipboardCheck },
  unknown: { label: "À déterminer", color: "text-muted-foreground", icon: ClipboardCheck },
};

export default function CardAlexProblemSummary({ problemType, projectType, urgency, summary }: Props) {
  const urg = urgencyConfig[urgency] || urgencyConfig.unknown;
  const UrgIcon = urg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <ClipboardCheck className="w-3.5 h-3.5" />
        Besoin identifié
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground capitalize">{projectType || problemType}</span>
          <span className={`flex items-center gap-1 text-xs font-medium ${urg.color}`}>
            <UrgIcon className="w-3 h-3" />
            {urg.label}
          </span>
        </div>
        {summary && (
          <p className="text-xs text-muted-foreground line-clamp-2">{summary}</p>
        )}
      </div>

      <div className="flex gap-2">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
          {problemType}
        </span>
        {projectType && projectType !== problemType && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
            {projectType}
          </span>
        )}
      </div>
    </motion.div>
  );
}
