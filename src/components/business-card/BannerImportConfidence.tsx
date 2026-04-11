import { motion } from "framer-motion";
import { ShieldCheck, AlertTriangle, ShieldAlert } from "lucide-react";

interface Props {
  confidence: number;
  fieldsCount: number;
  reviewCount: number;
}

export default function BannerImportConfidence({ confidence, fieldsCount, reviewCount }: Props) {
  const level = confidence >= 85 ? "high" : confidence >= 65 ? "medium" : "low";
  const config = {
    high: { icon: ShieldCheck, label: "Confiance élevée", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    medium: { icon: AlertTriangle, label: "Confiance moyenne", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    low: { icon: ShieldAlert, label: "Confiance faible", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  }[level];

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 p-3 rounded-xl border ${config.bg}`}
    >
      <Icon className={`w-5 h-5 ${config.color} shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
          <span className={`text-lg font-bold ${config.color}`}>{Math.round(confidence)}%</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {fieldsCount} champs extraits{reviewCount > 0 ? ` · ${reviewCount} à réviser` : ""}
        </p>
      </div>

      {/* Confidence bar */}
      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(confidence, 100)}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${
            level === "high" ? "bg-emerald-400" : level === "medium" ? "bg-amber-400" : "bg-red-400"
          }`}
        />
      </div>
    </motion.div>
  );
}
