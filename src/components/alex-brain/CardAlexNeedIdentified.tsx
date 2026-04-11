import { motion } from "framer-motion";
import { Brain, AlertTriangle, CheckCircle, MapPin } from "lucide-react";

interface Props {
  problemType?: string;
  serviceCategory?: string;
  urgency?: string;
  summary?: string;
}

export default function CardAlexNeedIdentified({ problemType, serviceCategory, urgency, summary }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2"
    >
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Besoin identifié</p>
      </div>
      {problemType && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="h-3 w-3 text-amber-500" />
          <span>Type : {problemType}</span>
        </div>
      )}
      {serviceCategory && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle className="h-3 w-3 text-emerald-500" />
          <span>Service : {serviceCategory}</span>
        </div>
      )}
      {urgency && (
        <div className="flex items-center gap-1.5 text-xs">
          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
            urgency === "emergency" ? "bg-destructive/20 text-destructive" :
            urgency === "high" ? "bg-amber-500/20 text-amber-600" :
            "bg-muted text-muted-foreground"
          }`}>
            {urgency === "emergency" ? "🚨 Urgence" : urgency === "high" ? "⚡ Prioritaire" : "📋 Planifié"}
          </span>
        </div>
      )}
      {summary && (
        <p className="text-xs text-muted-foreground italic">{summary}</p>
      )}
    </motion.div>
  );
}
